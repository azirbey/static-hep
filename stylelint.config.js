// This is an override stylesheet layered on top of the BetConstruct platform.
// Most "standard" CSS conventions do not apply: the selectors are theirs, and
// !important is the only reliable lever. Rules below are tuned to that reality
// so that a lint failure always means a real problem.

module.exports = {
	extends: 'stylelint-config-standard-less',
	rules: {
		// Nesting depth was the actual maintenance problem: the worst file sat at
		// 12 and produced 325-character selectors. Now that nothing exceeds 5,
		// this is an error rather than a warning — it is a ratchet whose only
		// job is to stop the tree growing back. Where an ancestor chain really
		// is load-bearing (see sportsbook/_left-menu.less) name the chain in a
		// variable instead of re-nesting to rebuild it.
		'max-nesting-depth': [
			5,
			{
				ignore: ['blockless-at-rules', 'pseudo-classes'],
			},
		],

		// Platform-owned names we cannot rename (.sp-s-l-b-content-wrp,
		// .CMSIconSVGWrapper, #betslip_container, …).
		'selector-class-pattern': null,
		'selector-id-pattern': null,

		// Reports every `.geist(Geist-Bold, 700)` mixin *call* as a duplicate
		// declaration. False positive on LESS mixin call syntax.
		'less/no-duplicate-variables': null,

		// Mostly the empty DOM-mirroring blocks in mobile/custom.less, which are
		// removed in the mobile pass. One legitimate hit remains: guard mixins
		// such as .hb-icon-btn-a-white(...) when (@icon-active = _) {} compile
		// to nothing by design.
		'block-no-empty': [true, { severity: 'warning' }],

		// Vendor prefixes here are deliberate: grouping the placeholder
		// selectors makes browsers drop the whole block, and -webkit-mask still
		// has no safe fallback. See core/mixins.less.
		'property-no-vendor-prefix': null,
		'selector-no-vendor-prefix': null,

		// Premise does not hold when every declaration carries !important.
		'no-descending-specificity': null,

		// Formatting is the editor's job, not the linter's.
		'rule-empty-line-before': null,
		'declaration-empty-line-before': null,
		'at-rule-empty-line-before': null,
		'comment-empty-line-before': null,

		// --- Currently violated, demoted to warning ---
		//
		// Each of these is auto-fixable, but the fix rewrites CSS that is
		// already serving live traffic. They stay warnings until the fix is
		// applied deliberately and its diff reviewed, then become errors.
		'selector-pseudo-element-colon-notation': ['double', { severity: 'warning' }],
		'length-zero-no-unit': [true, { severity: 'warning' }],
		'color-function-notation': ['modern', { severity: 'warning' }],
		'alpha-value-notation': ['percentage', { severity: 'warning' }],
		'shorthand-property-no-redundant-values': [true, { severity: 'warning' }],
		'selector-not-notation': ['complex', { severity: 'warning' }],
		'font-family-name-quotes': ['always-where-recommended', { severity: 'warning' }],
	},
};
