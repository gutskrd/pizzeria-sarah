<?php
/**
 * The printed trifold menu ("folder"). On the page it lies folded, and now and
 * then the cover lifts a little to show the menu inside. A tap opens a
 * full-screen view in which it unfolds in 3D and can be turned over.
 *
 * Both sides are uploaded as one landscape image each. The browser cuts them
 * into three panels at the fold lines, so nothing has to be processed on the server.
 */

defined( 'ABSPATH' ) || exit;

/** Everything the page needs to show the folder, or null when it is not ready or hidden. */
function psarah_folder_data( $ignore_visibility = false ) {
	$folder = psarah_settings()['folder'];
	if ( ( ! $folder['visible'] && ! $ignore_visibility ) || ! $folder['binnen'] || ! $folder['buiten'] ) {
		return null;
	}

	$sides = array();
	$ratio = 0;
	foreach ( array( 'binnen', 'buiten' ) as $side ) {
		$sources = psarah_image_sources( $folder[ $side ] );
		if ( ! $sources ) {
			return null;
		}
		$largest = end( $sources );
		$cuts    = $folder[ 'cuts_' . $side ];
		// Each panel's width relative to the sheet height; the folder uses the average.
		foreach ( array( $cuts[0], $cuts[1] - $cuts[0], 1 - $cuts[1] ) as $part ) {
			$ratio += $part * $largest['w'] / $largest['h'];
		}
		$sides[ $side ] = array(
			'cuts'    => array_map( 'floatval', $cuts ),
			'sources' => $sources,
		);
	}

	$label = $folder['label'];
	return array(
		'label'      => $label,
		'title'      => $label ? 'Menukaart · ' . $label : 'Menukaart',
		'panelRatio' => round( $ratio / 6, 5 ),
		'sides'      => $sides,
		'textUrl'    => $folder['text_url'],
		'pdfUrl'     => $folder['pdf'] ? set_url_scheme( wp_get_attachment_url( $folder['pdf'] ) ) : '',
	);
}

/** CSS that shows one panel of a sheet: the part between two fold lines. */
function psarah_slice_style( $url, $from, $to ) {
	$part = max( 0.01, $to - $from );
	$size = 100 / $part;
	$pos  = $part < 0.999 ? $from / ( 1 - $part ) * 100 : 0;
	return sprintf(
		'background-image:url("%s");background-size:%s%% 100%%;background-position:%s%% 0',
		psarah_css_url( $url ),
		round( $size, 4 ),
		round( $pos, 4 )
	);
}

/**
 * Shortcode [sarah_folder] and the "Menukaart-folder" block.
 *
 * @param array $atts uitlijning: midden (standaard), links of rechts. kleur: licht (standaard) of donker, for the text under the folder on a dark background.
 */
function psarah_render_folder( $atts = array() ) {
	$atts = shortcode_atts(
		array(
			'uitlijning' => 'midden',
			'kleur'      => 'licht',
		),
		is_array( $atts ) ? $atts : array(),
		'sarah_folder'
	);
	$data = psarah_folder_data();
	if ( ! $data ) {
		return psarah_editor_notice( __( 'De menukaart-folder is nog niet klaar of staat verborgen. Kies beide kanten bij Folder & 360°.', 'pizzeria-sarah' ) );
	}

	psarah_enqueue_folder_assets();

	$outside = $data['sides']['buiten'];
	$cuts    = $outside['cuts'];
	// The cover is the right panel of the outside; the flap underneath is the left panel.
	$cover_width = 3 * 480 / max( 0.15, 1 - $cuts[1] );
	$cover       = psarah_pick_source( $outside['sources'], $cover_width );
	$align       = in_array( $atts['uitlijning'], array( 'links', 'rechts' ), true ) ? $atts['uitlijning'] : 'midden';
	$tone        = 'donker' === $atts['kleur'] ? 'donker' : 'licht';
	$inside_full = end( $data['sides']['binnen']['sources'] );
	$aria        = $data['label']
		/* translators: %s: name or date of the menu, e.g. "november 2025" */
		? sprintf( __( 'Bekijk de menukaart-folder (%s)', 'pizzeria-sarah' ), $data['label'] )
		: __( 'Bekijk de menukaart-folder', 'pizzeria-sarah' );

	ob_start();
	?>
	<div class="ps-folder ps-align-<?php echo esc_attr( $align ); ?> ps-tone-<?php echo esc_attr( $tone ); ?>" data-ps-folder="<?php echo esc_attr( wp_json_encode( $data ) ); ?>">
		<a class="ps-folder__trigger" href="<?php echo esc_url( $inside_full['url'] ); ?>" aria-label="<?php echo esc_attr( $aria ); ?>" aria-haspopup="dialog">
			<span class="ps-folder__cover" style="aspect-ratio:<?php echo esc_attr( $data['panelRatio'] ); ?>">
				<span class="ps-folder__cover-inner">
					<span class="ps-folder__under" style="<?php echo esc_attr( psarah_slice_style( $cover['url'], 0, $cuts[0] ) ); ?>"></span>
					<span class="ps-folder__front" style="<?php echo esc_attr( psarah_slice_style( $cover['url'], $cuts[1], 1 ) ); ?>"></span>
				</span>
			</span>
			<span class="ps-folder__cta">
				<span class="ps-folder__line" aria-hidden="true"></span>
				<?php esc_html_e( 'Open de folder', 'pizzeria-sarah' ); ?>
				<svg class="ps-folder__arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</span>
		</a>
	</div>
	<?php
	return trim( ob_get_clean() );
}
add_shortcode( 'sarah_folder', 'psarah_render_folder' );

/** A URL that is safe inside url("…") in CSS; the whole style is escaped again as an attribute. */
function psarah_css_url( $url ) {
	return str_replace( array( '"', '\\', "\n", "\r" ), array( '%22', '%5C', '', '' ), esc_url_raw( $url ) );
}

/** A hint for the owner in the editor; visitors see nothing. */
function psarah_editor_notice( $message ) {
	$in_editor = ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || is_admin();
	if ( ! $in_editor || ! current_user_can( 'edit_posts' ) ) {
		return '';
	}
	return '<div class="ps-editor-notice">' . esc_html( $message ) . '</div>';
}
