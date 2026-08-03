<?php

namespace Arts\SmoothScrolling\Elementor;

use Elementor\Controls_Manager;
use Elementor\Core\Kits\Documents\Tabs\Tab_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * "Smooth Scrolling" tab in Elementor Site Settings.
 *
 * Every control is JS-bound (`frontend_available => true`): read by
 * Options::build() for the initial print, and forwarded whole by the inline
 * editor bridge (Plugin::print_editor_bridge()) for the live preview.
 * There is no selectors-based/appearance half — this plugin has no visual
 * surface to style.
 */
class SiteSettingsTab extends Tab_Base {

	const TAB_ID = 'arts-smooth-scrolling';

	public function get_id(): string {
		return self::TAB_ID;
	}

	public function get_title(): string {
		return esc_html__( 'Smooth Scrolling', 'smooth-scrolling-for-elementor' );
	}

	public function get_group(): string {
		return 'settings';
	}

	public function get_icon(): string {
		return 'eicon-scroll';
	}

	protected function register_tab_controls(): void {
		$this->add_section_smooth_scrolling();
	}

	private function add_section_smooth_scrolling(): void {
		$this->start_controls_section(
			'arts_smooth_scrolling_section',
			array(
				'label' => esc_html__( 'Smooth Scrolling', 'smooth-scrolling-for-elementor' ),
				'tab'   => $this->get_id(),
			)
		);

		// Off (return_value '') downloads no engine code on touch devices — the
		// gate never matches an empty query, so it never injects the bundle.
		$this->add_control(
			'arts_smooth_scrolling_disable_touch',
			array(
				'label'               => esc_html__( 'Disable on Touch Devices', 'smooth-scrolling-for-elementor' ),
				'type'                => Controls_Manager::SWITCHER,
				'return_value'        => '(hover: hover) and (pointer: fine)',
				'default'             => '(hover: hover) and (pointer: fine)',
				'frontend_available'  => true,
			)
		);

		$this->add_control(
			'arts_smooth_scrolling_duration',
			array(
				'label'               => esc_html__( 'Duration', 'smooth-scrolling-for-elementor' ),
				'type'                => Controls_Manager::SLIDER,
				'size_units'          => array( 'seconds' ),
				'range'               => array(
					'seconds' => array(
						'min'  => 0.1,
						'max'  => 4.0,
						'step' => 0.1,
					),
				),
				'default'             => array(
					'unit' => 'seconds',
					'size' => 1.2,
				),
				'frontend_available'  => true,
			)
		);

		$this->add_control(
			'arts_smooth_scrolling_easing',
			array(
				'label'               => esc_html__( 'Easing', 'smooth-scrolling-for-elementor' ),
				'type'                => Controls_Manager::SELECT,
				'options'             => array(
					'expo.out' => esc_html__( 'Expo Out', 'smooth-scrolling-for-elementor' ),
					'linear'   => esc_html__( 'Linear', 'smooth-scrolling-for-elementor' ),
				),
				'default'             => 'expo.out',
				'frontend_available'  => true,
			)
		);

		$this->end_controls_section();
	}
}
