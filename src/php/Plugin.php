<?php

namespace Arts\SmoothScrolling;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Frontend bootstrap + Elementor Site Settings integration.
 *
 * Every control is JS-bound — there is no appearance surface, so nothing
 * here mirrors a kit-CSS-variable pattern. Options::build() emits the exact
 * shape boot.ts consumes; the compiled engine CSS (Lenis's own stylesheet
 * plus the plugin's few rules) ships as a static file the gate links itself,
 * chained ahead of the engine script — see print_head().
 */
class Plugin {
	private static ?Plugin $instance = null;

	/** Memoized `arts_smooth_scrolling/enabled` verdict for this request. */
	private ?bool $enabled = null;

	public static function instance(): Plugin {
		return self::$instance ??= new self();
	}

	private function __construct() {
		// Late in the head on purpose: pre-paint needs only "inside <head>"
		// (nothing paints before body content), and consumers are footer
		// scripts — so the gate sits after the meta/styles where a loader
		// belongs instead of above the page's own title.
		add_action( 'wp_head', array( $this, 'print_head' ), 99 );
		// Last on the filter so every other plugin's attributes are already in
		// the string by the time we merge into them — see the callback.
		add_filter( 'language_attributes', array( $this, 'filter_language_attributes' ), PHP_INT_MAX );

		// Plugins load alphabetically, and Elementor fires this action during
		// its OWN load — a plugin sorting after "elementor" (ours does) never
		// sees the action fire if it only ever add_action()s for it here.
		// init_elementor()'s own add_action calls target hooks that fire much
		// later (kit tab registration, editor enqueue), so calling it
		// immediately when we've missed the boat is safe.
		if ( did_action( 'elementor/loaded' ) ) {
			$this->init_elementor();
		} else {
			add_action( 'elementor/loaded', array( $this, 'init_elementor' ) );
		}

		// Only the standalone plugin has a Plugins-page row to attach a link
		// to — the constant comes from the bootstrap file, absent when src/php
		// is consumed as a composer package.
		if ( defined( 'ARTS_SMOOTH_SCROLLING_PLUGIN_FILE' ) ) {
			add_filter(
				'plugin_action_links_' . plugin_basename( ARTS_SMOOTH_SCROLLING_PLUGIN_FILE ),
				array( $this, 'add_plugin_action_links' )
			);
		}
	}

	public function init_elementor(): void {
		add_action( 'elementor/kit/register_tabs', array( $this, 'register_kit_tab' ) );
		add_action( 'elementor/editor/after_enqueue_scripts', array( $this, 'print_editor_bridge' ) );
	}

	/** @param \Elementor\Core\Kits\Documents\Kit $kit */
	public function register_kit_tab( $kit ): void {
		$kit->register_tab( Elementor\SiteSettingsTab::TAB_ID, Elementor\SiteSettingsTab::class );
	}

	/**
	 * Prepends "Edit with Elementor" to the plugin's row on the Plugins page,
	 * deep-linking into Site Settings — the plugin's only configuration UI,
	 * otherwise reachable just by knowing it's there. No capability check:
	 * this filter only fires for users who can already see the Plugins list.
	 *
	 * @param array<int|string, string> $links
	 * @return array<int|string, string>
	 */
	public function add_plugin_action_links( array $links ): array {
		$url = $this->site_settings_url();

		if ( '' === $url ) {
			return $links;
		}

		array_unshift(
			$links,
			sprintf(
				'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
				esc_url( $url ),
				esc_html__( 'Settings', 'smooth-scrolling-for-elementor' )
			)
		);

		return $links;
	}

	/**
	 * Editor URL that lands on our Site Settings tab, or '' when it can't be
	 * built (Elementor inactive — possible below WP 6.5 where the Requires
	 * Plugins header isn't enforced — or a fresh site with nothing edited).
	 *
	 * The editor needs an ordinary document to boot against, so `post` is the
	 * most recently edited post — the same trick Elementor's own admin-bar
	 * "Site Settings" link uses. `active-document` then switches it to the kit,
	 * and Elementor's SwitchToActiveTab hook reads `active-tab` and routes
	 * panel/global/{tab} — no JS on our side.
	 */
	private function site_settings_url(): string {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! class_exists( '\Elementor\Utils' ) ) {
			return '';
		}

		$recent = \Elementor\Utils::get_recently_edited_posts_query( array( 'posts_per_page' => 1 ) );

		if ( ! $recent->post_count ) {
			return '';
		}

		$posts = $recent->get_posts();
		$post  = reset( $posts );

		if ( ! $post instanceof \WP_Post || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return '';
		}

		$kit_id = \Elementor\Plugin::$instance->kits_manager->get_active_id();
		if ( ! is_scalar( $kit_id ) ) {
			return '';
		}

		return admin_url(
			'post.php?post=' . $post->ID
			. '&action=elementor&active-document=' . $kit_id
			. '&active-tab=' . Elementor\SiteSettingsTab::TAB_ID
		);
	}

	/**
	 * Prints options + boot descriptor + gate.js inline on wp_head — the
	 * plugin's ONLY inline output. Nothing is enqueued: the gate sets the
	 * <html> state classes synchronously, then fetches the compiled
	 * stylesheet and the engine bundle itself, chained in that order, once
	 * the matching media query confirms it's needed (gate.ts). The `css`
	 * key on the boot descriptor carries that
	 * stylesheet's URL — every selector in it is gated behind a class the
	 * engine applies at runtime, so it stays a genuine request rather than
	 * inline dead bytes on every page view, including touch devices where
	 * the gate downloads nothing at all.
	 *
	 * Guarded on Elementor's presence, not just is_enabled(): without
	 * Elementor there is no Site Settings tab to configure this from, so the
	 * plugin stays fully inert rather than running on hardcoded defaults.
	 *
	 * The markers are per-optimizer opt-outs — no single one covers them all:
	 * noptimize comments (Autoptimize), data-no-optimize (LiteSpeed),
	 * data-cfasync (Cloudflare Rocket Loader, also honored by Autoptimize and
	 * LiteSpeed), nowprocket (WP Rocket). The
	 * script tag carries NO id, for the same AJAX-transitions replay reason
	 * every Arts plugin's gate does: id'd head scripts get re-executed on
	 * every transition, and a head tag is invisible to that lookup anyway.
	 *
	 * Options ride the same block as inline JSON, not wp_localize_script:
	 * localize string-casts scalars (`prefersGSAPRaf: true` would become
	 * "1", `anchors.immediate: false` would become ""); json_encode
	 * preserves types.
	 */
	public function print_head(): void {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! $this->is_enabled() ) {
			return;
		}

		$slug     = 'smooth-scrolling-for-elementor';
		$base_dir = untrailingslashit( plugin_dir_path( __FILE__ ) ) . '/libraries/' . $slug;
		$base_url = untrailingslashit( plugin_dir_url( __FILE__ ) ) . '/libraries/' . $slug;

		$gate = $base_dir . '/gate.js';
		$js   = $base_dir . '/' . $slug . '.js';
		$css  = $base_dir . '/' . $slug . '.css';

		if ( ! file_exists( $gate ) || ! file_exists( $js ) || ! file_exists( $css ) ) {
			return;
		}

		$editor = $this->is_editor_preview();
		$boot   = array(
			'js'     => esc_url_raw( $base_url . '/' . $slug . '.js?ver=' . filemtime( $js ) ),
			'css'    => esc_url_raw( $base_url . '/' . $slug . '.css?ver=' . filemtime( $css ) ),
			'editor' => $editor,
		);

		$options = Options::build();

		$code = 'window.artsSmoothScrollingOptions = ' . wp_json_encode( $options ) . ";\n"
			. 'window.artsSmoothScrollingBoot = ' . wp_json_encode( $boot ) . ";\n"
			. file_get_contents( $gate );

		echo "<!--noptimize-->\n";
		wp_print_inline_script_tag(
			$code,
			array(
				'data-no-optimize' => '1',
				'data-cfasync'     => 'false',
				'nowprocket'       => true,
			)
		);
		echo "<!--/noptimize-->\n";
	}

	/**
	 * Lazily memoized `arts_smooth_scrolling/enabled` verdict — evaluated
	 * once per request, shared by the <html> class filter and print_head().
	 * The editor preview bypasses the filter entirely: it is the product's
	 * showroom, and the live-toggle in Site Settings needs the engine loaded
	 * so it can react to a kit-change event.
	 */
	private function is_enabled(): bool {
		return $this->enabled ??= $this->is_editor_preview()
			|| (bool) apply_filters( 'arts_smooth_scrolling/enabled', true );
	}

	/**
	 * A request disabled via `arts_smooth_scrolling/enabled` still gets
	 * `no-smooth-scroll` on <html>: the class pair is the documented "which
	 * world" signal, and a page carrying neither class would be a third
	 * state no CSS consumer handles. It cannot ride the gate (which simply
	 * doesn't print when disabled) and cannot wait for wp_head —
	 * language_attributes renders inside the <html> tag itself. Guarded on
	 * Elementor's presence like print_head(): without Elementor the plugin
	 * never ran at all, so there is no "which world" to announce.
	 *
	 * Merged, never appended: this filter is the only route to an <html> class
	 * (core has no body_class() equivalent for it), so other plugins pile onto
	 * it too, and a second class attribute is a parse error — the browser keeps
	 * the first and silently drops the rest, which is how the class contract
	 * breaks with no error anywhere. The tag processor writes into whichever
	 * attribute the browser will actually read and handles the quoting and
	 * escaping; the synthetic <html> wrapper is ours, hence the fixed substr.
	 *
	 * Front end only: _wp_admin_html_begin() hardcodes class="wp-toolbar" on
	 * the admin <html> in markup this filter never sees, so merging is
	 * impossible there and anything we add is a duplicate attribute the browser
	 * drops. The class is a front-end contract anyway — the gate rides wp_head,
	 * which admin screens don't fire.
	 *
	 * @param string $output
	 */
	public function filter_language_attributes( string $output ): string {
		if ( is_admin() || ! class_exists( '\Elementor\Plugin' ) || $this->is_enabled() ) {
			return $output;
		}

		$tags = new \WP_HTML_Tag_Processor( '<html ' . $output . '>' );

		// Nothing to merge into: $output didn't parse as attributes at all.
		if ( ! $tags->next_tag() ) {
			return $output . ' class="no-smooth-scroll"';
		}

		$tags->add_class( 'no-smooth-scroll' );

		return substr( $tags->get_updated_html(), 6, -1 );
	}

	/**
	 * The preview iframe loads the engine immediately: it is the product's
	 * showroom, and boot.ts's kit-change live-preview listener has to exist
	 * before the first Site Settings change — lazy loading would drop any
	 * change made before the user ever scrolls the preview.
	 */
	private function is_editor_preview(): bool {
		return class_exists( '\Elementor\Plugin' )
			&& \Elementor\Plugin::$instance->preview->is_preview_mode();
	}

	/**
	 * Inline editor bridge: forwards kit-setting changes into the preview
	 * iframe as an `arts-smooth-scrolling:kit-change` CustomEvent boot.ts
	 * listens for. Any `arts_smooth_scrolling_*` change forwards — every
	 * control here is JS-bound, so a live preview needs the whole bag, not a
	 * filtered subset.
	 *
	 * A $e UI-After hook on `document/elements/settings`, NOT a subscription
	 * on `elementor.settings.page`: that manager (and its Backbone model) is
	 * REPLACED on every document load — opening Site Settings swaps the
	 * current document to the kit, so anything bound earlier sits on the
	 * orphaned page model and never fires for kit changes. The hook holds no
	 * references (getConditions re-reads the current document each time) and
	 * runs after Elementor has already updated its settings model — the same
	 * pattern core uses for its own kit live previews.
	 */
	public function print_editor_bridge(): void {
		$script = <<<'JS'
(function () {
	var register = function () {
		var forward = function () {
			var frame = elementor.$preview && elementor.$preview[0];
			if (!frame || !frame.contentWindow) {
				return;
			}
			// The full kit attribute bag: while the kit document is current,
			// elementor.settings.page.model IS the kit's settings model.
			frame.contentWindow.dispatchEvent(
				new CustomEvent('arts-smooth-scrolling:kit-change', {
					detail: { settings: elementor.settings.page.model.attributes }
				})
			);
		};
		var Watcher = class extends $e.modules.hookUI.After {
			getCommand() {
				return 'document/elements/settings';
			}
			getId() {
				return 'arts-smooth-scrolling-forward-kit-settings';
			}
			getContainerType() {
				return 'document';
			}
			getConditions(args) {
				var current = elementor.documents.getCurrent();
				if (!current || 'kit' !== current.config.type) {
					return false;
				}
				var settings = (args && args.settings) || {};
				for (var key in settings) {
					if (0 === key.indexOf('arts_smooth_scrolling_')) {
						return true;
					}
				}
				return false;
			}
			apply() {
				forward();
			}
		};
		$e.hooks.registerUIAfter(new Watcher());
	};
	if (window.elementor && window.$e && $e.modules && $e.modules.hookUI) {
		register();
	} else if (window.jQuery) {
		jQuery(window).on('elementor:init', register);
	}
})();
JS;

		wp_add_inline_script( 'elementor-editor', $script );
	}
}
