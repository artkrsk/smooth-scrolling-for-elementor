<?php
/**
 * Plugin Name: Arts Smooth Scrolling for Elementor
 * Description: Lenis-powered smooth scrolling for Elementor.
 * Version: 1.0.1
 * Author: Artem Semkin
 * Author URI: https://artemsemkin.com
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0
 * Requires at least: 6.2
 * Requires PHP: 8.0
 * Requires Plugins: elementor
 * Text Domain: smooth-scrolling-for-elementor
 * Plugin URI: https://artemsemkin.com/plugins/smooth-scrolling-for-elementor/
 * Tested up to: 7.1
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ARTS_SMOOTH_SCROLLING_PLUGIN_VERSION', '1.0.1' );
define( 'ARTS_SMOOTH_SCROLLING_PLUGIN_FILE', __FILE__ );

require_once __DIR__ . '/vendor/autoload.php';

\Arts\SmoothScrolling\Plugin::instance();
