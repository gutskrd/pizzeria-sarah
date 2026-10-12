<?php
/**
 * Styles and scripts. They are only loaded on pages that show the folder or
 * the 360° photo; the 360° viewer itself only loads when someone opens it.
 */

defined( 'ABSPATH' ) || exit;

function psarah_register_assets() {
	wp_register_style( 'psarah-common', PSARAH_URL . 'assets/common.css', array(), PSARAH_VERSION );
	wp_register_script( 'psarah-common', PSARAH_URL . 'assets/common.js', array(), PSARAH_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );

	wp_register_style( 'psarah-folder', PSARAH_URL . 'assets/folder.css', array( 'psarah-common' ), PSARAH_VERSION );
	wp_register_script( 'psarah-folder', PSARAH_URL . 'assets/folder.js', array( 'psarah-common' ), PSARAH_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );

	wp_register_style( 'psarah-pano', PSARAH_URL . 'assets/panorama.css', array( 'psarah-common' ), PSARAH_VERSION );
	wp_register_script( 'psarah-pano', PSARAH_URL . 'assets/panorama.js', array( 'psarah-common' ), PSARAH_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );
}
add_action( 'init', 'psarah_register_assets' );

function psarah_enqueue_folder_assets() {
	wp_enqueue_style( 'psarah-folder' );
	wp_enqueue_script( 'psarah-folder' );
}

function psarah_enqueue_pano_assets() {
	wp_enqueue_style( 'psarah-pano' );
	wp_enqueue_script( 'psarah-pano' );
}

/**
 * Loads the styles in the <head> when the page contains the folder or the 360°
 * photo, so they are styled from the first moment. Page builders such as
 * Elementor, Beaver Builder and Bricks keep their layout in post meta instead
 * of the post content, so that is searched as well.
 */
function psarah_enqueue_for_shortcodes() {
	if ( ! is_singular() ) {
		return;
	}
	$id       = get_queried_object_id();
	$haystack = (string) get_post_field( 'post_content', $id );
	foreach ( (array) get_post_meta( $id ) as $values ) {
		foreach ( (array) $values as $value ) {
			if ( is_string( $value ) && ( false !== strpos( $value, 'sarah_' ) || false !== strpos( $value, 'pizzeria-sarah/' ) ) ) {
				$haystack .= "\n" . $value;
			}
		}
	}
	if ( false !== strpos( $haystack, 'sarah_folder' ) || false !== strpos( $haystack, 'pizzeria-sarah/folder' ) ) {
		psarah_enqueue_folder_assets();
	}
	if ( false !== strpos( $haystack, 'sarah_360' ) || false !== strpos( $haystack, 'pizzeria-sarah/panorama' ) ) {
		psarah_enqueue_pano_assets();
	}
}
add_action( 'wp_enqueue_scripts', 'psarah_enqueue_for_shortcodes' );

/**
 * When the folder or photo turns up after the <head> was sent (a widget, a
 * template part, a builder we did not recognise), its styles are printed right
 * before it instead of at the bottom of the page, so it never shows unstyled.
 */
function psarah_late_styles( $handle ) {
	if ( ! did_action( 'wp_head' ) || wp_style_is( $handle, 'done' ) ) {
		return '';
	}
	ob_start();
	wp_print_styles( array( $handle ) );
	return (string) ob_get_clean();
}

/**
 * Caching plugins can hold back scripts until the visitor first moves or taps,
 * so the first tap on the folder would open the plain image instead. These
 * small scripts are marked so WP Rocket, LiteSpeed Cache and Cloudflare Rocket
 * Loader leave them alone; they are already deferred and tiny.
 */
function psarah_script_attributes( $tag, $handle ) {
	if ( ! in_array( $handle, array( 'psarah-common', 'psarah-folder', 'psarah-pano' ), true ) || false !== strpos( $tag, 'data-cfasync' ) ) {
		return $tag;
	}
	return preg_replace( '/<script\b/', '<script data-cfasync="false" data-no-optimize="1" data-no-minify="1" nowprocket', $tag, 1 );
}
add_filter( 'script_loader_tag', 'psarah_script_attributes', 10, 2 );
