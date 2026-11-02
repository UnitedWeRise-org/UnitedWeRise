/**
 * Shared two-axis reaction selectors for posts and comments.
 *
 * Quality = content vote (Love/Like/Meh/Dislike).
 * Feeling = how the event/issue feels (Beaming/Smile/Neutral/Sad/Angry).
 *
 * Display rules:
 * - Quality summary shows only the combined LOVE + LIKE count (likes), and the
 *   selected quality icon (or an outline thumbs-up when nothing is selected).
 * - Feeling summary shows the top three feeling icons by count, overlapping,
 *   plus the total feeling count.
 * - Option words are available in the expanded menu; the collapsed summary is
 *   icon + count only (word via native title/aria-label).
 *
 * @module components/reaction-selectors
 */

export const QUALITY_OPTIONS = [
    { value: 'LOVE', icon: '❤️', label: 'Love', countKey: 'loveCount' },
    { value: 'LIKE', icon: '👍', label: 'Like', countKey: 'likeCount' },
    { value: 'MEH', icon: '🤷', label: 'Meh', countKey: 'mehCount' },
    { value: 'DISLIKE', icon: '👎', label: 'Dislike', countKey: 'dislikeCount' }
];

export const FEELING_OPTIONS = [
    { value: 'VERY_POSITIVE', icon: '😁', label: 'Beaming', countKey: 'veryPositiveCount' },
    { value: 'POSITIVE', icon: '🙂', label: 'Smile', countKey: 'positiveCount' },
    { value: 'NEUTRAL', icon: '😐', label: 'Neutral', countKey: 'neutralFeelingCount' },
    { value: 'NEGATIVE', icon: '😢', label: 'Sad', countKey: 'negativeCount' },
    { value: 'VERY_NEGATIVE', icon: '😠', label: 'Angry', countKey: 'veryNegativeCount' }
];

const THUMB_OUTLINE_ICON = `
    <svg class="reaction-thumb-outline" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 10.5V21H4.5A1.5 1.5 0 0 1 3 19.5v-7.5A1.5 1.5 0 0 1 4.5 10.5H7Zm0 0 4.2-7.1a1.6 1.6 0 0 1 2.9 1.2L13 10.5h5.2a2 2 0 0 1 2 2.4l-1.3 6.5a2 2 0 0 1-2 1.6H7"
              fill="none" stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
`;

function optionFor(options, value) {
    return options.find((option) => option.value === value) || null;
}

function countOf(counts, option) {
    return Number(counts?.[option.countKey]) || 0;
}

function qualityLikeCount(counts) {
    return (Number(counts?.loveCount) || 0) + (Number(counts?.likeCount) || 0);
}

function feelingTotal(counts) {
    return FEELING_OPTIONS.reduce((sum, option) => sum + countOf(counts, option), 0);
}

function topFeelings(counts, limit = 3) {
    return FEELING_OPTIONS
        .map((option) => ({ option, count: countOf(counts, option) }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function feelingTitle(counts) {
    const entries = topFeelings(counts, FEELING_OPTIONS.length);
    const total = feelingTotal(counts);
    if (entries.length === 0) return 'How does this make you feel?';
    return `Feeling: ${entries.map((entry) => `${entry.option.label} ${entry.count}`).join(', ')} (${total} total)`;
}

function summaryContent(axis, selected, counts) {
    if (axis === 'quality') {
        const selectedOption = optionFor(QUALITY_OPTIONS, selected);
        const icon = selectedOption ? selectedOption.icon : THUMB_OUTLINE_ICON;
        const title = selectedOption
            ? `Quality: ${selectedOption.label} (${qualityLikeCount(counts)} likes)`
            : `Rate the information quality (${qualityLikeCount(counts)} likes)`;
        return {
            html: `<span class="reaction-summary-icon">${icon}</span><span class="reaction-summary-count">${qualityLikeCount(counts)}</span>`,
            title
        };
    }

    const top = topFeelings(counts);
    const icons = top.length > 0
        ? top.map((entry, index) => `<span class="reaction-summary-face" style="z-index:${10 - index}">${entry.option.icon}</span>`).join('')
        : '<span class="reaction-summary-face">🙂</span>';

    return {
        html: `<span class="reaction-summary-faces">${icons}</span><span class="reaction-summary-count">${feelingTotal(counts)}</span>`,
        title: feelingTitle(counts)
    };
}

function renderOptions(axis, action, idAttribute, targetId, options, selected, counts) {
    return options.map((option) => {
        const active = selected === option.value ? 'active' : '';
        const count = countOf(counts, option);
        const title = axis === 'feeling' ? `${option.label} (${count})` : option.label;
        return `
            <button type="button"
                    class="reaction-option ${active}"
                    data-action="${action}"
                    ${idAttribute}="${targetId}"
                    data-param1="${axis}"
                    data-param2="${option.value}"
                    data-reaction-axis="${axis}"
                    data-reaction-value="${option.value}"
                    title="${title}"
                    aria-label="${title}"
                    aria-pressed="${selected === option.value ? 'true' : 'false'}">
                <span class="reaction-option-icon">${option.icon}</span>
            </button>
        `;
    }).join('');
}

function renderSelector(params) {
    const { axis, action, idAttribute, targetId, options, selected, counts } = params;
    const summary = summaryContent(axis, selected, counts);
    const optionsHtml = renderOptions(axis, action, idAttribute, targetId, options, selected, counts);

    return `
        <details class="reaction-selector" data-reaction-axis="${axis}">
            <summary class="reaction-selector-summary" title="${summary.title}" aria-label="${summary.title}">
                ${summary.html}
            </summary>
            <div class="reaction-selector-options">${optionsHtml}</div>
        </details>
    `;
}

/**
 * Render both reaction selectors (side by side).
 *
 * @param {Object} params
 * @param {'post'|'comment'} params.targetType
 * @param {string} params.targetId
 * @param {string|null} params.selectedQuality
 * @param {string|null} params.selectedFeeling
 * @param {Object} params.counts - Post/comment count fields
 * @returns {string} HTML
 */
export function renderReactionSelectors(params) {
    const { targetType, targetId, selectedQuality, selectedFeeling, counts } = params;
    const action = targetType === 'post' ? 'toggleReaction' : 'toggleCommentReaction';
    const idAttribute = targetType === 'post' ? 'data-post-id' : 'data-comment-id';

    return `
        <div class="reaction-groups">
            ${renderSelector({
                axis: 'quality',
                action,
                idAttribute,
                targetId,
                options: QUALITY_OPTIONS,
                selected: selectedQuality || null,
                counts
            })}
            ${renderSelector({
                axis: 'feeling',
                action,
                idAttribute,
                targetId,
                options: FEELING_OPTIONS,
                selected: selectedFeeling || null,
                counts
            })}
        </div>
    `;
}

/**
 * Update a rendered selector's summary/options from the API response.
 *
 * @param {HTMLElement} container - Post actions or comment element
 * @param {'quality'|'feeling'} axis
 * @param {Object} response - API response (quality, feeling, counts)
 */
export function updateReactionSelector(container, axis, response) {
    if (!container) return;
    const selector = container.querySelector(`.reaction-selector[data-reaction-axis="${axis}"]`);
    if (!selector) return;

    const counts = response?.counts || {};
    const selected = axis === 'quality' ? response?.quality : response?.feeling;
    const summary = summaryContent(axis, selected, counts);

    selector.querySelectorAll('.reaction-option').forEach((button) => {
        const value = button.dataset.reactionValue;
        const active = selected === value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');


    });

    const summaryElement = selector.querySelector('.reaction-selector-summary');
    if (summaryElement) {
        summaryElement.innerHTML = summary.html;
        summaryElement.setAttribute('title', summary.title);
        summaryElement.setAttribute('aria-label', summary.title);
    }
}

export default { renderReactionSelectors, updateReactionSelector, QUALITY_OPTIONS, FEELING_OPTIONS };
