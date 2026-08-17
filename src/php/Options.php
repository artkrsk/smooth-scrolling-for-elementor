<?php

namespace Arts\SmoothScrolling;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reads the kit-bound Site Settings controls and emits exactly the
 * `TOptions` shape boot.ts consumes. The `anchors` block is derived here the
 * same way mapKitSettings() derives it for the editor's live-preview path
 * (TS side), so the two can never drift apart.
 *
 * Every control is JS-bound — there is no appearance surface, so nothing
 * here mirrors kit CSS variables. Without Elementor (or before a kit
 * exists) every key resolves to its control default.
 */
class Options {

	private const EASINGS               = array( 'expo.out', 'linear' );
	private const DEFAULT_DURATION      = 1.2;
	private const DEFAULT_EASING        = 'expo.out';
	private const DISABLE_TOUCH_DEFAULT = '(hover: hover) and (pointer: fine)';

	/** @return array<string, mixed> */
	public static function build(): array {
		$duration = self::size_of( 'arts_smooth_scrolling_duration', self::DEFAULT_DURATION );
		$easing   = self::easing_of( 'arts_smooth_scrolling_easing', self::DEFAULT_EASING );

		$options = array(
			'matchMedia'     => self::match_media(),
			// No control for this one — always on, filterable below like every other key.
			'prefersGSAPRaf' => true,
			'lenisOptions'   => array(
				'duration' => $duration,
				'easing'   => $easing,
				'anchors'  => array(
					'offset'    => 0,
					'immediate' => false,
					'lock'      => false,
					'force'     => true,
					'easing'    => self::DEFAULT_EASING === $easing ? 'expo.inOut' : $easing,
					'duration'  => round( $duration * 0.8, 4 ),
				),
			),
		);

		/**
		 * Filters the smooth scrolling options payload before it is printed inline.
		 *
		 * @param array<string, mixed> $options
		 */
		return apply_filters( 'arts_smooth_scrolling/options', $options );
	}

	/** Raw disable_touch control value: the media query string, or '' once switched off. */
	private static function match_media(): string {
		$value = self::kit_value( 'arts_smooth_scrolling_disable_touch' );
		if ( null === $value ) {
			return self::DISABLE_TOUCH_DEFAULT;
		}
		return is_string( $value ) ? $value : '';
	}

	private static function easing_of( string $key, string $default ): string {
		$value = self::kit_value( $key );
		return in_array( $value, self::EASINGS, true ) ? $value : $default;
	}

	/** Raw kit value for a key, or null when Elementor/kit/value is absent. */
	private static function kit_value( string $key ): mixed {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! \Elementor\Plugin::$instance || ! \Elementor\Plugin::$instance->kits_manager ) {
			return null;
		}
		return \Elementor\Plugin::$instance->kits_manager->get_current_settings( $key );
	}

	private static function size_of( string $key, float $default ): float {
		$value = self::kit_value( $key );
		if ( is_array( $value ) && isset( $value['size'] ) && is_numeric( $value['size'] ) ) {
			return (float) $value['size'];
		}
		if ( is_numeric( $value ) ) {
			return (float) $value;
		}
		return $default;
	}
}
