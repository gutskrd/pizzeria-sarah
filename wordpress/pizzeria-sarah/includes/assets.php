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
 * Loads the styles in the <head> when the page contains the shortcode, so the
 * folded flyer is styled from the first moment (blocks do this on their own).
 */
function psarah_enqueue_for_shortcodes() {
	if ( ! is_singular() ) {
		return;
	}
	$content = (string) get_post_field( 'post_content', get_queried_object_id() );
	if ( has_shortcode( $content, 'sarah_folder' ) ) {
		psarah_enqueue_folder_assets();
	}
	if ( has_shortcode( $content, 'sarah_360' ) ) {
		psarah_enqueue_pano_assets();
	}
}
add_action( 'wp_enqueue_scripts', 'psarah_enqueue_for_shortcodes' );
