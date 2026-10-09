<?php
/**
 * Image helpers: the sizes WordPress made of an upload, and the ready-made
 * versions of the 360° photo (one for phones, one for tablets and computers).
 */

defined( 'ABSPATH' ) || exit;

const PSARAH_VARIANTS_OPTION = 'psarah_pano_variants';
const PSARAH_UPLOAD_DIR      = 'pizzeria-sarah';

/** Widths of the ready-made 360° versions: phones, then tablets and computers. */
const PSARAH_PANO_WIDTHS = array( 4096, 8192 );

/**
 * All sizes WordPress has of an image with the same shape as the original,
 * from small to large: [ [ 'url' => …, 'w' => …, 'h' => … ], … ].
 */
function psarah_image_sources( $id ) {
	$full = wp_get_attachment_image_src( $id, 'full' );
	if ( ! $full || empty( $full[1] ) || empty( $full[2] ) ) {
		return array();
	}
	$ratio = $full[1] / $full[2];
	$out   = array();
	foreach ( array( 'medium_large', 'large', '1536x1536', '2048x2048', 'full' ) as $size ) {
		$src = wp_get_attachment_image_src( $id, $size );
		if ( ! $src || empty( $src[1] ) || empty( $src[2] ) ) {
			continue;
		}
		// Skip cropped sizes: they would not line up with the fold lines.
		if ( abs( $src[1] / $src[2] - $ratio ) > 0.02 ) {
			continue;
		}
		$out[ (int) $src[1] ] = array(
			'url' => set_url_scheme( $src[0] ),
			'w'   => (int) $src[1],
			'h'   => (int) $src[2],
		);
	}
	ksort( $out );
	return array_values( $out );
}

/** The smallest size that is at least $width wide, or else the largest. */
function psarah_pick_source( $sources, $width ) {
	foreach ( $sources as $source ) {
		if ( $source['w'] >= $width ) {
			return $source;
		}
	}
	return $sources ? end( $sources ) : null;
}

/** The size of the original upload (before WordPress scaled it down to 2560 pixels). */
function psarah_original_size( $id ) {
	$meta = wp_get_attachment_metadata( $id );
	if ( ! is_array( $meta ) || empty( $meta['width'] ) || empty( $meta['height'] ) ) {
		return null;
	}
	$w = (int) $meta['width'];
	$h = (int) $meta['height'];
	if ( ! empty( $meta['original_image'] ) ) {
		$path = wp_get_original_image_path( $id );
		$size = $path && is_readable( $path ) ? wp_getimagesize( $path ) : false;
		if ( $size ) {
			$w = (int) $size[0];
			$h = (int) $size[1];
		}
	}
	return array(
		'w' => $w,
		'h' => $h,
	);
}

function psarah_upload_dir() {
	$uploads = wp_upload_dir( null, false );
	return array(
		'dir' => trailingslashit( $uploads['basedir'] ) . PSARAH_UPLOAD_DIR,
		'url' => set_url_scheme( trailingslashit( $uploads['baseurl'] ) . PSARAH_UPLOAD_DIR ),
	);
}

/** The ready-made versions of a 360° photo, small to large. */
function psarah_pano_variants( $image_id ) {
	$stored = get_option( PSARAH_VARIANTS_OPTION, array() );
	if ( ! is_array( $stored ) || empty( $stored[ $image_id ] ) || ! is_array( $stored[ $image_id ] ) ) {
		return array();
	}
	$dir = psarah_upload_dir();
	$out = array();
	foreach ( $stored[ $image_id ] as $variant ) {
		if ( empty( $variant['file'] ) || ! is_file( $dir['dir'] . '/' . $variant['file'] ) ) {
			continue;
		}
		$out[] = array(
			'url' => $dir['url'] . '/' . rawurlencode( $variant['file'] ),
			'w'   => (int) $variant['w'],
			'h'   => (int) $variant['h'],
		);
	}
	usort(
		$out,
		static function ( $a, $b ) {
			return $a['w'] - $b['w'];
		}
	);
	return $out;
}

/** Stores one ready-made version, replacing an earlier one of the same width. */
function psarah_store_pano_variant( $image_id, $width, $height, $file ) {
	$stored = get_option( PSARAH_VARIANTS_OPTION, array() );
	$stored = is_array( $stored ) ? $stored : array();
	$list   = isset( $stored[ $image_id ] ) && is_array( $stored[ $image_id ] ) ? $stored[ $image_id ] : array();
	$dir    = psarah_upload_dir();
	$keep   = array();
	foreach ( $list as $variant ) {
		if ( (int) $variant['w'] === (int) $width ) {
			wp_delete_file( $dir['dir'] . '/' . $variant['file'] );
			continue;
		}
		$keep[] = $variant;
	}
	$keep[]               = array(
		'w'    => (int) $width,
		'h'    => (int) $height,
		'file' => $file,
	);
	$stored[ $image_id ] = $keep;
	update_option( PSARAH_VARIANTS_OPTION, $stored, false );
}

/** Removes ready-made versions of every 360° photo except the one in use (and one being prepared). */
function psarah_prune_pano_variants( $keep_id ) {
	$stored = get_option( PSARAH_VARIANTS_OPTION, array() );
	if ( ! is_array( $stored ) || ! $stored ) {
		return;
	}
	$dir = psarah_upload_dir();
	foreach ( $stored as $image_id => $list ) {
		if ( (int) $image_id === (int) $keep_id ) {
			continue;
		}
		foreach ( (array) $list as $variant ) {
			if ( ! empty( $variant['file'] ) ) {
				wp_delete_file( $dir['dir'] . '/' . $variant['file'] );
			}
		}
		unset( $stored[ $image_id ] );
	}
	update_option( PSARAH_VARIANTS_OPTION, $stored, false );
}

/**
 * How much of the sphere a 360° photo covers. Phones often make photos that
 * are not a full sphere; they say so in "photo sphere" (GPano) metadata.
 * Returns null for a full 360 × 180 photo.
 */
function psarah_sphere_coverage( $image_id ) {
	$path = wp_get_original_image_path( $image_id );
	if ( ! $path || ! is_readable( $path ) ) {
		return null;
	}
	$stamp  = filesize( $path ) . '-' . filemtime( $path );
	$cached = get_post_meta( $image_id, '_psarah_sphere', true );
	if ( is_array( $cached ) && isset( $cached['stamp'] ) && $cached['stamp'] === $stamp ) {
		return $cached['coverage'];
	}

	$coverage = null;
	// The metadata sits near the start of the file.
	$head = file_get_contents( $path, false, null, 0, 524288 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$tag  = static function ( $name ) use ( $head ) {
		if ( preg_match( '/GPano:' . $name . '\s*=\s*"([\d.]+)"/', $head, $m ) || preg_match( '/<GPano:' . $name . '>\s*([\d.]+)\s*</', $head, $m ) ) {
			return (float) $m[1];
		}
		return null;
	};
	if ( $head ) {
		$full_w = $tag( 'FullPanoWidthPixels' );
		$full_h = $tag( 'FullPanoHeightPixels' );
		$crop_w = $tag( 'CroppedAreaImageWidthPixels' );
		$crop_h = $tag( 'CroppedAreaImageHeightPixels' );
		$top    = $tag( 'CroppedAreaTopPixels' );
		if ( $full_w && $full_h && $crop_w && $crop_h && ( $crop_w < $full_w - 1 || $crop_h < $full_h - 1 ) ) {
			$coverage = array(
				'haov'    => round( $crop_w / $full_w * 360, 3 ),
				'vaov'    => round( $crop_h / $full_h * 180, 3 ),
				'vOffset' => round( ( ( ( null === $top ? ( $full_h - $crop_h ) / 2 : $top ) + $crop_h / 2 ) / $full_h - 0.5 ) * -180, 3 ),
			);
		}
	}
	if ( null === $coverage ) {
		// No metadata: a wider image than 2:1 is a band around the horizon.
		$size = psarah_original_size( $image_id );
		if ( $size && $size['w'] / $size['h'] > 2.05 ) {
			$coverage = array(
				'haov'    => 360,
				'vaov'    => round( 360 / ( $size['w'] / $size['h'] ), 3 ),
				'vOffset' => 0,
			);
		}
	}

	update_post_meta(
		$image_id,
		'_psarah_sphere',
		array(
			'stamp'    => $stamp,
			'coverage' => $coverage,
		)
	);
	return $coverage;
}
