<?php
/**
 * Two blocks for the block editor: "Menukaart-folder" and "360° rondkijken".
 * In the editor they show the real thing, so the owner sees where it goes.
 */

defined( 'ABSPATH' ) || exit;

function psarah_register_blocks() {
	wp_register_script(
		'psarah-blocks',
		PSARAH_URL . 'assets/blocks.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render' ),
		PSARAH_VERSION,
		true
	);
	wp_add_inline_script(
		'psarah-blocks',
		'window.psarahBlocks = ' . wp_json_encode( array( 'settingsUrl' => admin_url( 'admin.php?page=pizzeria-sarah' ) ) ) . ';',
		'before'
	);

	register_block_type(
		PSARAH_DIR . 'blocks/folder',
		array(
			'render_callback' => static function ( $attributes ) {
				return psarah_block_wrap( psarah_render_folder( $attributes ) );
			},
		)
	);
	register_block_type(
		PSARAH_DIR . 'blocks/panorama',
		array(
			'render_callback' => static function ( $attributes ) {
				return psarah_block_wrap( psarah_render_pano( $attributes ) );
			},
		)
	);
}
add_action( 'init', 'psarah_register_blocks', 20 );

function psarah_block_wrap( $html ) {
	if ( '' === $html ) {
		return '';
	}
	return '<div ' . get_block_wrapper_attributes() . '>' . $html . '</div>';
}
