<?php
/**
 * Stored settings: one option with the folder and the 360° photo.
 */

defined( 'ABSPATH' ) || exit;

const PSARAH_OPTION = 'psarah_settings';

// Fold lines are stored as a fraction of the sheet width. Same limits as the website.
const PSARAH_MIN_CUT   = 0.15;
const PSARAH_MAX_CUT   = 0.85;
const PSARAH_MIN_PANEL = 0.15;

function psarah_defaults() {
	return array(
		'folder' => array(
			'binnen'      => 0,
			'buiten'      => 0,
			'cuts_binnen' => array( 1 / 3, 2 / 3 ),
			'cuts_buiten' => array( 1 / 3, 2 / 3 ),
			'label'       => '',
			'text_url'    => '',
			'pdf'         => 0,
			'visible'     => true,
		),
		'pano'   => array(
			'image'      => 0,
			'title'      => 'Kijk binnen bij Pizzeria Sarah',
			'yaw'        => 0,
			'pitch'      => 0,
			'hfov'       => 100,
			'autorotate' => true,
			'visible'    => true,
		),
	);
}

function psarah_settings() {
	$saved    = get_option( PSARAH_OPTION, array() );
	$defaults = psarah_defaults();
	$saved    = is_array( $saved ) ? $saved : array();
	return array(
		'folder' => array_merge( $defaults['folder'], isset( $saved['folder'] ) && is_array( $saved['folder'] ) ? $saved['folder'] : array() ),
		'pano'   => array_merge( $defaults['pano'], isset( $saved['pano'] ) && is_array( $saved['pano'] ) ? $saved['pano'] : array() ),
	);
}

/** Keeps both fold lines inside the sheet and at least one panel width apart. */
function psarah_clean_cuts( $value, $fallback ) {
	if ( is_string( $value ) ) {
		$value = explode( ',', $value );
	}
	if ( ! is_array( $value ) || count( $value ) !== 2 ) {
		return $fallback;
	}
	$a = (float) $value[0];
	$b = (float) $value[1];
	if ( ! is_finite( $a ) || ! is_finite( $b ) ) {
		return $fallback;
	}
	$a = min( max( $a, PSARAH_MIN_CUT ), PSARAH_MAX_CUT - PSARAH_MIN_PANEL );
	$b = min( max( $b, $a + PSARAH_MIN_PANEL ), PSARAH_MAX_CUT );
	return array( round( $a, 4 ), round( $b, 4 ) );
}

/** Only accepts an attachment of the right kind. */
function psarah_clean_attachment( $id, $kind ) {
	$id = absint( $id );
	if ( ! $id || get_post_type( $id ) !== 'attachment' ) {
		return 0;
	}
	if ( 'image' === $kind && ! wp_attachment_is_image( $id ) ) {
		return 0;
	}
	if ( 'pdf' === $kind && get_post_mime_type( $id ) !== 'application/pdf' ) {
		return 0;
	}
	return $id;
}

function psarah_sanitize_settings( $input ) {
	$defaults = psarah_defaults();
	$input    = is_array( $input ) ? $input : array();
	$folder   = isset( $input['folder'] ) && is_array( $input['folder'] ) ? $input['folder'] : array();
	$pano     = isset( $input['pano'] ) && is_array( $input['pano'] ) ? $input['pano'] : array();

	$clean = array(
		'folder' => array(
			'binnen'      => psarah_clean_attachment( isset( $folder['binnen'] ) ? $folder['binnen'] : 0, 'image' ),
			'buiten'      => psarah_clean_attachment( isset( $folder['buiten'] ) ? $folder['buiten'] : 0, 'image' ),
			'cuts_binnen' => psarah_clean_cuts( isset( $folder['cuts_binnen'] ) ? $folder['cuts_binnen'] : null, $defaults['folder']['cuts_binnen'] ),
			'cuts_buiten' => psarah_clean_cuts( isset( $folder['cuts_buiten'] ) ? $folder['cuts_buiten'] : null, $defaults['folder']['cuts_buiten'] ),
			'label'       => mb_substr( sanitize_text_field( isset( $folder['label'] ) ? $folder['label'] : '' ), 0, 60 ),
			'text_url'    => esc_url_raw( isset( $folder['text_url'] ) ? trim( $folder['text_url'] ) : '', array( 'http', 'https' ) ),
			'pdf'         => psarah_clean_attachment( isset( $folder['pdf'] ) ? $folder['pdf'] : 0, 'pdf' ),
			'visible'     => ! empty( $folder['visible'] ),
		),
		'pano'   => array(
			'image'      => psarah_clean_attachment( isset( $pano['image'] ) ? $pano['image'] : 0, 'image' ),
			'title'      => mb_substr( sanitize_text_field( isset( $pano['title'] ) ? $pano['title'] : '' ), 0, 80 ),
			'yaw'        => psarah_clamp_number( isset( $pano['yaw'] ) ? $pano['yaw'] : 0, -180, 180, 0 ),
			'pitch'      => psarah_clamp_number( isset( $pano['pitch'] ) ? $pano['pitch'] : 0, -85, 85, 0 ),
			'hfov'       => psarah_clamp_number( isset( $pano['hfov'] ) ? $pano['hfov'] : 100, 40, 120, 100 ),
			'autorotate' => ! empty( $pano['autorotate'] ),
			'visible'    => ! empty( $pano['visible'] ),
		),
	);

	if ( '' === $clean['pano']['title'] ) {
		$clean['pano']['title'] = $defaults['pano']['title'];
	}

	// Ready-made versions of an earlier 360° photo are no longer needed.
	psarah_prune_pano_variants( $clean['pano']['image'] );

	return $clean;
}

function psarah_clamp_number( $value, $min, $max, $fallback ) {
	if ( ! is_numeric( $value ) ) {
		return $fallback;
	}
	$value = (float) $value;
	return round( min( max( $value, $min ), $max ), 2 );
}
