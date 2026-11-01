/**
 * Shared two-axis reaction selectors for posts and comments.
 *
 * Quality = content vote (Love/Like/Meh/Dislike).
 * Feeling = how the event/issue feels (Beaming/Smile/Neutral/Sad/Angry).
 *
 * Rendered as two compact <details> selectors so clicking the summary opens
 * the options without a permanent 4/5-button matrix.
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

function optionFor(options, value) {
    return options.find((option) => option.value === value) || null;
}

function renderSelector(params) {
    const { axis, action, idAttribute, targetId, options, selected, emptyIcon, emptyLabel, counts } = params;
    const selectedOption = optionFor(options, selected);
    const total = options.reduce((sum, option) => sum + (Number(counts?.[option.countKey]) || 0), 0);

    const optionsHtml = options.map((option) => {
        const count = Number(counts?.[option.countKey]) || 0;
        const active = selected === option.value ? 'active' : '';
        return `
            <button type="button"
                    class="reaction-option ${active}"
                    data-action="${action}"
                    ${idAttribute}="${targetId}"
                    data-param1="${axis}"
                    data-param2="${option.value}"
                    data-reaction-axis="${axis}"
                    data-reaction-value="${option.value}"
                    aria-pressed="${selected === option.value ? 'true' : 'false'}">
                <span class="reaction-option-icon">${option.icon}</span>
                <span class="reaction-option-label">${option.label}</span>
                <span class="reaction-option-count">${count}</span>
            </button>
        `;
    }).join('');

    return `
        <details class="reaction-selector" data-reaction-axis="${axis}">
            <summary class="reaction-selector-summary" title="${axis === 'quality' ? 'Rate the information quality' : 'How does this make you feel?'}">
                <span class="reaction-summary-icon">${selectedOption ? selectedOption.icon : emptyIcon}</span>
                <span class="reaction-summary-label">${selectedOption ? selectedOption.label : emptyLabel}</span>
                <span class="reaction-summary-count">${total}</span>
            </summary>
            <div class="reaction-selector-options">${optionsHtml}</div>
        </details>
    `;
}

/**
 * Render both reaction selectors.
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
                emptyIcon: '⚖️',
                emptyLabel: 'Quality',
                counts
            })}
            ${renderSelector({
                axis: 'feeling',
                action,
                idAttribute,
                targetId,
                options: FEELING_OPTIONS,
                selected: selectedFeeling || null,
                emptyIcon: '🙂',
                emptyLabel: 'Feeling',
                counts
            })}
        </div>
    `;
}

/**
 * Update a rendered selector's counts/active state from the API response.
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
    const options = axis === 'quality' ? QUALITY_OPTIONS : FEELING_OPTIONS;
    const selectedOption = optionFor(options, selected);
    let total = 0;

    selector.querySelectorAll('.reaction-option').forEach((button) => {
        const value = button.dataset.reactionValue;
        const option = optionFor(options, value);
        if (!option) return;
        const count = Number(counts[option.countKey]) || 0;
        total += count;
        const active = selected === value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        const countElement = button.querySelector('.reaction-option-count');
        if (countElement) countElement.textContent = count;
    });

    const summaryIcon = selector.querySelector('.reaction-summary-icon');
    const summaryLabel = selector.querySelector('.reaction-summary-label');
    const summaryCount = selector.querySelector('.reaction-summary-count');
    if (summaryIcon) summaryIcon.textContent = selectedOption ? selectedOption.icon : (axis === 'quality' ? '⚖️' : '🙂');
    if (summaryLabel) summaryLabel.textContent = selectedOption ? selectedOption.label : (axis === 'quality' ? 'Quality' : 'Feeling');
    if (summaryCount) summaryCount.textContent = total;
}

export default { renderReactionSelectors, updateReactionSelector, QUALITY_OPTIONS, FEELING_OPTIONS };
