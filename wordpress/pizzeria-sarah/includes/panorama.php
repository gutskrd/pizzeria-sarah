<?php
/**
 * The 360° photo. On the page: a wide photo that slowly drifts sideways and
 * invites a tap. The viewer itself (Pannellum) only loads after that tap, in a
 * full-screen view, so the page stays fast and scrolling on a phone is never
 * caught by the photo.
 */

defined( 'ABSPATH' ) || exit;

/** Everything the page needs to show the 360° photo, or null when it is not ready or hidden. */
function psarah_pano_data( $ignore_visibility = false ) {
	$pano = psarah_settings()['pano'];
	if ( ( ! $pano['visible'] && ! $ignore_visibility ) || ! $pano['image'] ) {
		return null;
	}
	$id      = $pano['image'];
	$sources = psarah_pano_sources( $id );
	if ( ! $sources ) {
		return null;
	}
	$poster = psarah_pick_source( psarah_image_sources( $id ), 2048 );

	return array(
		'title'      => $pano['title'],
		'sources'    => $sources,
		'poster'     => $poster ? $poster['url'] : $sources[0]['url'],
		'yaw'        => (float) $pano['yaw'],
		'pitch'      => (float) $pano['pitch'],
		'hfov'       => (float) $pano['hfov'],
		'autorotate' => (bool) $pano['autorotate'],
		'coverage'   => psarah_sphere_coverage( $id ),
		'viewerJs'   => PSARAH_URL . 'assets/vendor/pannellum/pannellum.js?ver=2.5.7',
		'viewerCss'  => PSARAH_URL . 'assets/vendor/pannellum/pannellum.css?ver=2.5.7',
	);
}

/**
 * The versions the viewer can choose from, small to large. Prefers the
 * ready-made versions; otherwise uses what WordPress has: its scaled copy
 * (at most 2560 pixels) and the original when that is not too large.
 */
function psarah_pano_sources( $id ) {
	$variants = psarah_pano_variants( $id );
	if ( $variants ) {
		return $variants;
	}
	$out  = array();
	$full = wp_get_attachment_image_src( $id, 'full' );
	if ( $full ) {
		$out[ (int) $full[1] ] = array(
			'url' => set_url_scheme( $full[0] ),
			'w'   => (int) $full[1],
			'h'   => (int) $full[2],
		);
	}
	$original = psarah_original_size( $id );
	$url      = wp_get_original_image_url( $id );
	if ( $original && $url && $original['w'] <= 8192 && ! isset( $out[ $original['w'] ] ) ) {
		$out[ $original['w'] ] = array(
			'url' => set_url_scheme( $url ),
			'w'   => $original['w'],
			'h'   => $original['h'],
		);
	}
	ksort( $out );
	return array_values( $out );
}

/**
 * Shortcode [sarah_360] and the "360° rondkijken" block.
 *
 * @param array $atts titel: other text on the photo. hoogte: laag, normaal (standaard) of hoog.
 */
function psarah_render_pano( $atts = array() ) {
	$atts = shortcode_atts(
		array(
			'titel'  => '',
			'hoogte' => 'normaal',
		),
		is_array( $atts ) ? $atts : array(),
		'sarah_360'
	);
	$data = psarah_pano_data();
	if ( ! $data ) {
		return psarah_editor_notice( __( 'De 360°-foto is nog niet gekozen of staat verborgen. Kies hem bij Folder & 360°.', 'pizzeria-sarah' ) );
	}
	if ( '' !== trim( $atts['titel'] ) ) {
		$data['title'] = sanitize_text_field( $atts['titel'] );
	}
	$height = in_array( $atts['hoogte'], array( 'laag', 'hoog' ), true ) ? $atts['hoogte'] : 'normaal';

	psarah_enqueue_pano_assets();

	$poster = 'background-image:url("' . psarah_css_url( $data['poster'] ) . '")';
	ob_start();
	?>
	<div class="ps-pano ps-pano--<?php echo esc_attr( $height ); ?>" data-ps-pano="<?php echo esc_attr( wp_json_encode( $data ) ); ?>">
		<a class="ps-pano__poster" href="<?php echo esc_url( end( $data['sources'] )['url'] ); ?>" aria-haspopup="dialog">
			<span class="ps-pano__strip" aria-hidden="true">
				<span style="<?php echo esc_attr( $poster ); ?>"></span>
				<span style="<?php echo esc_attr( $poster ); ?>"></span>
			</span>
			<span class="ps-pano__shade" aria-hidden="true"></span>
			<span class="ps-pano__badge" aria-hidden="true">
				<svg width="22" height="22" viewBox="0 0 24 24" focusable="false"><ellipse cx="12" cy="12" rx="9.5" ry="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19Z" fill="none" stroke="currentColor" stroke-width="1.8" opacity=".45"/><path d="m17.6 13.9 2.3 1.4-1.2 2.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
				360°
			</span>
			<span class="ps-pano__text">
				<span class="ps-pano__title"><?php echo esc_html( $data['title'] ); ?></span>
				<span class="ps-pano__sub">
					<span class="ps-pano__play" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></span>
					<span class="ps-only-touch"><?php esc_html_e( 'Tik en kijk rond', 'pizzeria-sarah' ); ?></span>
					<span class="ps-only-mouse"><?php esc_html_e( 'Klik en kijk rond', 'pizzeria-sarah' ); ?></span>
				</span>
			</span>
		</a>
	</div>
	<?php
	return trim( ob_get_clean() );
}
add_shortcode( 'sarah_360', 'psarah_render_pano' );
