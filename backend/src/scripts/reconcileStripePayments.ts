/**
 * Reconcile stuck Stripe payments (DONATION/FEE) against Stripe.
 *
 * Payments created on/after 2025-10-16 could end up stuck in PENDING/FAILED
 * because the Stripe webhook was CSRF-blocked (403) and never marked them
 * COMPLETED. This script cross-checks each candidate payment against Stripe
 * (Checkout Sessions in the window matched by metadata.paymentId), and in
 * `apply` mode marks the ones Stripe actually collected as COMPLETED (with
 * charge id, receipt number/URL, campaign increment, and an audit
 * PaymentWebhook row).
 *
 * Modes (env RECONCILE_MODE):
 * - dry-run (default): report only, no writes
 * - apply: write DB updates
 *
 * Intended to run inside the production container (has DATABASE_URL +
 * STRIPE_SECRET_KEY) as a one-off Azure Container Apps job:
 *   node dist/scripts/reconcileStripePayments.js
 */
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';

const MODE = process.env.RECONCILE_MODE || 'dry-run';
const SINCE = new Date('2025-10-16T00:00:00Z');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {});

async function main() {
  const rows = await prisma.payment.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      type: { in: ['DONATION', 'FEE'] },
      createdAt: { gte: SINCE }
    },
    orderBy: { createdAt: 'asc' },
    take: 1000
  });

  const candidates = new Map(rows.map((r) => [r.id, r]));
  console.log(`mode=${MODE} candidates=${rows.length}`);

  let paid = 0;
  let notPaid = 0;
  let noStripe = 0;
  let applied = 0;

  // Fetch Checkout Sessions in the window and match by metadata.paymentId
  let startingAfter: string | undefined;
  let matched = new Set<string>();
  let sessionsFetched = 0;

  for (;;) {
    const page: Stripe.ApiList<Stripe.Checkout.Session> = await stripe.checkout.sessions.list({
      created: { gte: Math.floor(SINCE.getTime() / 1000) },
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });

    for (const session of page.data) {
      sessionsFetched++;
      const pid: string | undefined = (session.metadata as Record<string, string> | null)?.paymentId;
      const p = pid ? candidates.get(pid) : undefined;
      if (!p || matched.has(pid)) continue;
      matched.add(pid);

      if (session.payment_status !== 'paid') {
        notPaid++;
        console.log(`  ${pid} | NOT_PAID(${session.payment_status})`);
        continue;
      }

      paid++;
      let chargeId: string | null = null;
      let receiptUrl: string | null = null;
      if (typeof session.payment_intent === 'string') {
        try {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (typeof pi.latest_charge === 'string') chargeId = pi.latest_charge;
        } catch { /* ignore */ }
      }
      if (chargeId) {
        try {
          const ch = await stripe.charges.retrieve(chargeId, { expand: ['receipt_url'] });
          if (typeof ch.receipt_url === 'string') receiptUrl = ch.receipt_url;
        } catch { /* ignore */ }
      }

      if (MODE !== 'apply') {
        console.log(`  ${pid} | [would complete] | ${(p.amount / 100).toFixed(2)} USD | charge=${chargeId || '-'} | receipt=${receiptUrl ? 'y' : 'n'} | session=${session.id}`);
        continue;
      }

      // ---- APPLY ----
      const receiptNumber = `UWR-${new Date().getFullYear()}-${p.id.slice(-8).toUpperCase()}`;
      await prisma.payment.update({
        where: { id: p.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(session.created * 1000),
          paymentMethodType: (session.payment_method_types?.[0]) || 'card',
          stripeChargeId: chargeId || undefined,
          receiptUrl: receiptUrl || undefined,
          receiptNumber,
          receiptSent: true,
          receiptSentAt: new Date(),
          failureReason: null
        }
      });

      if (p.campaignId) {
        await prisma.donationCampaign.update({
          where: { id: p.campaignId },
          data: { raised: { increment: p.amount } }
        }).catch(() => { /* campaign may have been deleted */ });
      }

      // Audit trail: mark as processed via a synthetic PaymentWebhook row
      await prisma.paymentWebhook.upsert({
        where: { stripeEventId: `reconciled:${p.id}` },
        create: {
          stripeEventId: `reconciled:${p.id}`,
          eventType: 'checkout.session.completed',
          processed: true,
          processedAt: new Date(),
          payload: { source: 'reconcile', mode: MODE }
        },
        update: {}
      }).catch(() => { /* best effort */ });

      applied++;
      console.log(`  ${pid} | APPLIED COMPLETED | ${(p.amount / 100).toFixed(2)} USD | charge=${chargeId || '-'} | receipt=${receiptUrl ? 'y' : 'n'}`);
    }

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  // Candidates that had no matching Stripe Checkout Session at all
  for (const [id] of candidates) {
    if (!matched.has(id)) {
      noStripe++;
      const p = candidates.get(id)!;
      console.log(`  ${id} | NO_STRIPE | ${(p.amount / 100).toFixed(2)} USD`);
    }
  }

  console.log(
    `SUMMARY sessionsFetched=${sessionsFetched} candidates=${rows.length} paid=${paid} notPaid=${notPaid} noStripeRecord=${noStripe} ` +
    (MODE === 'apply' ? `applied=${applied}` : `wouldComplete=${paid}`)
  );

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('FATAL', err);
  try { await prisma.$disconnect(); } catch { /* ignore */ }
  process.exit(1);
});