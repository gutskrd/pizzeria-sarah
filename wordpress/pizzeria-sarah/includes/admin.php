<?php
/**
 * The settings page "Folder & 360°" in the WordPress admin.
 */

defined( 'ABSPATH' ) || exit;

function psarah_admin_menu() {
	$hook = add_menu_page(
		__( 'Folder & 360°', 'pizzeria-sarah' ),
		__( 'Folder & 360°', 'pizzeria-sarah' ),
		'manage_options',
		'pizzeria-sarah',
		'psarah_render_admin_page',
		'dashicons-book-alt',
		21
	);
	add_action(
		'admin_enqueue_scripts',
		static function ( $current ) use ( $hook ) {
			if ( $current === $hook ) {
				psarah_admin_assets();
			}
		}
	);
}
add_action( 'admin_menu', 'psarah_admin_menu' );

function psarah_admin_init() {
	register_setting(
		'psarah',
		PSARAH_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'psarah_sanitize_settings',
			'default'           => psarah_defaults(),
		)
	);
}
add_action( 'admin_init', 'psarah_admin_init' );

/** What the settings page needs to know about an image or PDF from the media library. */
function psarah_attachment_for_js( $id ) {
	if ( ! $id ) {
		return null;
	}
	$item = wp_prepare_attachment_for_js( $id );
	if ( ! $item ) {
		return null;
	}
	$original = wp_attachment_is_image( $id ) ? psarah_original_size( $id ) : null;
	return array(
		'id'               => (int) $id,
		'url'              => $item['url'],
		'filename'         => $item['filename'],
		'mime'             => $item['mime'],
		'width'            => isset( $item['width'] ) ? (int) $item['width'] : 0,
		'height'           => isset( $item['height'] ) ? (int) $item['height'] : 0,
		'sizes'            => isset( $item['sizes'] ) ? $item['sizes'] : array(),
		'originalImageURL' => isset( $item['originalImageURL'] ) ? $item['originalImageURL'] : $item['url'],
		'originalWidth'    => $original ? $original['w'] : 0,
		'originalHeight'   => $original ? $original['h'] : 0,
	);
}

function psarah_admin_assets() {
	wp_enqueue_media();
	psarah_enqueue_folder_assets();
	wp_enqueue_style( 'psarah-pano' );
	wp_enqueue_style( 'psarah-pannellum', PSARAH_URL . 'assets/vendor/pannellum/pannellum.css', array(), '2.5.7' );
	wp_enqueue_script( 'psarah-pannellum', PSARAH_URL . 'assets/vendor/pannellum/pannellum.js', array(), '2.5.7', true );
	wp_enqueue_style( 'psarah-admin', PSARAH_URL . 'assets/admin.css', array( 'psarah-common' ), PSARAH_VERSION );
	wp_enqueue_script( 'psarah-admin', PSARAH_URL . 'assets/admin.js', array( 'psarah-folder', 'psarah-pannellum', 'media-editor' ), PSARAH_VERSION, true );

	$settings = psarah_settings();
	wp_add_inline_script(
		'psarah-admin',
		'window.psarahAdmin = ' . wp_json_encode(
			array(
				'settings'    => $settings,
				'media'       => array(
					'binnen' => psarah_attachment_for_js( $settings['folder']['binnen'] ),
					'buiten' => psarah_attachment_for_js( $settings['folder']['buiten'] ),
					'pdf'    => psarah_attachment_for_js( $settings['folder']['pdf'] ),
					'pano'   => psarah_attachment_for_js( $settings['pano']['image'] ),
				),
				'variants'    => $settings['pano']['image'] ? psarah_pano_variants( $settings['pano']['image'] ) : array(),
				'widths'      => PSARAH_PANO_WIDTHS,
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				'nonce'       => wp_create_nonce( 'psarah_pano' ),
				'limits'      => array(
					'minCut'   => PSARAH_MIN_CUT,
					'maxCut'   => PSARAH_MAX_CUT,
					'minPanel' => PSARAH_MIN_PANEL,
				),
				'pannellumJs' => PSARAH_URL . 'assets/vendor/pannellum/pannellum.js?ver=2.5.7',
			)
		) . ';',
		'before'
	);
}

function psarah_toggle( $name, $checked, $label, $description = '' ) {
	?>
	<label class="ps-toggle">
		<input type="hidden" name="<?php echo esc_attr( $name ); ?>" value="0">
		<input type="checkbox" name="<?php echo esc_attr( $name ); ?>" value="1" <?php checked( $checked ); ?>>
		<span class="ps-toggle__track" aria-hidden="true"><span class="ps-toggle__thumb"></span></span>
		<span class="ps-toggle__text">
			<span class="ps-toggle__label"><?php echo esc_html( $label ); ?></span>
			<?php if ( $description ) : ?>
				<span class="ps-toggle__desc"><?php echo esc_html( $description ); ?></span>
			<?php endif; ?>
		</span>
	</label>
	<?php
}

function psarah_render_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s      = psarah_settings();
	$folder = $s['folder'];
	$pano   = $s['pano'];
	$name   = PSARAH_OPTION;
	?>
	<div class="wrap ps-admin">
		<h1><?php esc_html_e( 'Folder & 360°', 'pizzeria-sarah' ); ?></h1>
		<p class="ps-admin__intro"><?php esc_html_e( 'Kies hier de afbeeldingen van de menukaart-folder en de 360°-foto. Zet ze daarna op een pagina met de blokken „Menukaart-folder” en „360° rondkijken” (uitleg onderaan).', 'pizzeria-sarah' ); ?></p>

		<?php settings_errors(); ?>

		<form method="post" action="options.php" id="ps-form">
			<?php settings_fields( 'psarah' ); ?>

			<section class="ps-card" aria-labelledby="ps-folder-title">
				<header class="ps-card__head">
					<h2 id="ps-folder-title"><?php esc_html_e( 'Menukaart-folder', 'pizzeria-sarah' ); ?></h2>
					<span class="ps-badge" data-folder-status></span>
				</header>
				<p class="ps-card__intro"><?php esc_html_e( 'De gedrukte menukaart. Op de website ligt hij dichtgevouwen; wie erop tikt, ziet hem in 3D openvouwen. Kies beide kanten van de open folder als liggende foto of scan, met de drie delen naast elkaar. De gele vouwlijnen worden vanzelf gezocht; versleep ze als ze niet precies op de vouw staan.', 'pizzeria-sarah' ); ?></p>

				<div class="ps-sides">
					<?php
					$sides = array(
						'binnen' => array( __( 'Binnenkant', 'pizzeria-sarah' ), __( 'De kant die je ziet als de folder helemaal open ligt.', 'pizzeria-sarah' ) ),
						'buiten' => array( __( 'Buitenkant', 'pizzeria-sarah' ), __( 'De kant met de voorkant. De voorkant (met het logo) staat rechts.', 'pizzeria-sarah' ) ),
					);
					foreach ( $sides as $side => $text ) :
						?>
						<div class="ps-side" data-side="<?php echo esc_attr( $side ); ?>">
							<h3><?php echo esc_html( $text[0] ); ?></h3>
							<p class="ps-muted"><?php echo esc_html( $text[1] ); ?></p>
							<input type="hidden" name="<?php echo esc_attr( $name ); ?>[folder][<?php echo esc_attr( $side ); ?>]" value="<?php echo esc_attr( $folder[ $side ] ); ?>" data-field="id">
							<input type="hidden" name="<?php echo esc_attr( $name ); ?>[folder][cuts_<?php echo esc_attr( $side ); ?>]" value="<?php echo esc_attr( implode( ',', $folder[ 'cuts_' . $side ] ) ); ?>" data-field="cuts">
							<div class="ps-side__body" data-body></div>
						</div>
					<?php endforeach; ?>
				</div>

				<div class="ps-fields">
					<p class="ps-field">
						<label for="ps-folder-label"><?php esc_html_e( 'Naam of datum van de folder', 'pizzeria-sarah' ); ?> <span class="ps-muted">(<?php esc_html_e( 'mag leeg', 'pizzeria-sarah' ); ?>)</span></label>
						<input id="ps-folder-label" type="text" class="regular-text" maxlength="60" name="<?php echo esc_attr( $name ); ?>[folder][label]" value="<?php echo esc_attr( $folder['label'] ); ?>" placeholder="<?php esc_attr_e( 'Bijvoorbeeld: november 2025', 'pizzeria-sarah' ); ?>">
						<span class="ps-help"><?php esc_html_e( 'Staat boven de geopende folder.', 'pizzeria-sarah' ); ?></span>
					</p>
					<p class="ps-field">
						<label for="ps-folder-text"><?php esc_html_e( 'Link naar de menukaart als tekst', 'pizzeria-sarah' ); ?> <span class="ps-muted">(<?php esc_html_e( 'mag leeg', 'pizzeria-sarah' ); ?>)</span></label>
						<input id="ps-folder-text" type="url" class="regular-text" name="<?php echo esc_attr( $name ); ?>[folder][text_url]" value="<?php echo esc_attr( $folder['text_url'] ); ?>" placeholder="https://">
						<span class="ps-help"><?php esc_html_e( 'Bijvoorbeeld je pagina met de menukaart. Dan staat er een knop „Als tekst lezen” bij de folder.', 'pizzeria-sarah' ); ?></span>
					</p>
					<div class="ps-field">
						<span class="ps-label"><?php esc_html_e( 'Menukaart als pdf', 'pizzeria-sarah' ); ?> <span class="ps-muted">(<?php esc_html_e( 'mag leeg', 'pizzeria-sarah' ); ?>)</span></span>
						<input type="hidden" name="<?php echo esc_attr( $name ); ?>[folder][pdf]" value="<?php echo esc_attr( $folder['pdf'] ); ?>" data-pdf-id>
						<div class="ps-pdf" data-pdf></div>
						<span class="ps-help"><?php esc_html_e( 'Dan kunnen bezoekers de menukaart downloaden vanuit de folder.', 'pizzeria-sarah' ); ?></span>
					</div>
					<div class="ps-field">
						<?php psarah_toggle( $name . '[folder][visible]', $folder['visible'], __( 'Folder tonen op de website', 'pizzeria-sarah' ), __( 'Uit: de folder verdwijnt van de website, maar je instellingen blijven bewaard.', 'pizzeria-sarah' ) ); ?>
					</div>
				</div>

				<div class="ps-actions">
					<button type="button" class="button button-secondary button-hero" data-folder-preview disabled><?php esc_html_e( 'Bekijk zoals bezoekers hem zien', 'pizzeria-sarah' ); ?></button>
				</div>
			</section>

			<section class="ps-card" aria-labelledby="ps-pano-title">
				<header class="ps-card__head">
					<h2 id="ps-pano-title"><?php esc_html_e( '360°-foto', 'pizzeria-sarah' ); ?></h2>
					<span class="ps-badge" data-pano-status></span>
				</header>
				<p class="ps-card__intro"><?php esc_html_e( 'Een foto waarin bezoekers rondkijken in de pizzeria. Kies een 360°-foto (een brede foto, twee keer zo breed als hoog). Hij wordt vanzelf klaargemaakt voor telefoon, tablet en computer. Draai daarna in het voorbeeld naar het mooiste beeld en kies „Gebruik dit als beginbeeld”.', 'pizzeria-sarah' ); ?></p>

				<input type="hidden" name="<?php echo esc_attr( $name ); ?>[pano][image]" value="<?php echo esc_attr( $pano['image'] ); ?>" data-pano-id>
				<input type="hidden" name="<?php echo esc_attr( $name ); ?>[pano][yaw]" value="<?php echo esc_attr( $pano['yaw'] ); ?>" data-pano-yaw>
				<input type="hidden" name="<?php echo esc_attr( $name ); ?>[pano][pitch]" value="<?php echo esc_attr( $pano['pitch'] ); ?>" data-pano-pitch>
				<input type="hidden" name="<?php echo esc_attr( $name ); ?>[pano][hfov]" value="<?php echo esc_attr( $pano['hfov'] ); ?>" data-pano-hfov>
				<div class="ps-pano-editor" data-pano-body></div>

				<div class="ps-fields">
					<p class="ps-field">
						<label for="ps-pano-title-field"><?php esc_html_e( 'Tekst op de foto', 'pizzeria-sarah' ); ?></label>
						<input id="ps-pano-title-field" type="text" class="regular-text" maxlength="80" name="<?php echo esc_attr( $name ); ?>[pano][title]" value="<?php echo esc_attr( $pano['title'] ); ?>">
					</p>
					<div class="ps-field">
						<?php psarah_toggle( $name . '[pano][autorotate]', $pano['autorotate'], __( 'Langzaam laten ronddraaien', 'pizzeria-sarah' ), __( 'Tot de bezoeker zelf gaat rondkijken.', 'pizzeria-sarah' ) ); ?>
					</div>
					<div class="ps-field">
						<?php psarah_toggle( $name . '[pano][visible]', $pano['visible'], __( '360°-foto tonen op de website', 'pizzeria-sarah' ) ); ?>
					</div>
				</div>
			</section>

			<div class="ps-savebar">
				<?php submit_button( __( 'Wijzigingen opslaan', 'pizzeria-sarah' ), 'primary large', 'submit', false ); ?>
				<span class="ps-savebar__note" data-dirty hidden><?php esc_html_e( 'Je hebt wijzigingen die nog niet zijn opgeslagen.', 'pizzeria-sarah' ); ?></span>
			</div>
		</form>

		<section class="ps-card ps-howto" aria-labelledby="ps-howto-title">
			<h2 id="ps-howto-title"><?php esc_html_e( 'Zo zet je ze op je website', 'pizzeria-sarah' ); ?></h2>
			<ol>
				<li><?php esc_html_e( 'Open de pagina waar ze moeten komen (bijvoorbeeld de homepage of de pagina Menukaart) en klik op Bewerken.', 'pizzeria-sarah' ); ?></li>
				<li><?php esc_html_e( 'Klik op het plusje (+) en zoek „Menukaart-folder” of „360° rondkijken”. Klik erop: het blok staat er meteen in, precies zoals bezoekers het zien.', 'pizzeria-sarah' ); ?></li>
				<li><?php esc_html_e( 'Klik op Bijwerken of Publiceren. Klaar.', 'pizzeria-sarah' ); ?></li>
			</ol>
			<p><?php esc_html_e( 'Gebruik je een paginabouwer zoals Elementor of Divi, of de klassieke editor? Plak dan een van deze codes in een tekst- of shortcode-blok:', 'pizzeria-sarah' ); ?></p>
			<div class="ps-codes">
				<div class="ps-code"><code>[sarah_folder]</code><button type="button" class="button" data-copy="[sarah_folder]"><?php esc_html_e( 'Kopiëren', 'pizzeria-sarah' ); ?></button></div>
				<div class="ps-code"><code>[sarah_360]</code><button type="button" class="button" data-copy="[sarah_360]"><?php esc_html_e( 'Kopiëren', 'pizzeria-sarah' ); ?></button></div>
			</div>
			<p class="ps-muted"><?php esc_html_e( 'Staat de folder op een donkere achtergrond? Gebruik dan [sarah_folder kleur="donker"] voor witte tekst. Voor een lagere of hogere 360°-foto: [sarah_360 hoogte="laag"] of [sarah_360 hoogte="hoog"].', 'pizzeria-sarah' ); ?></p>
		</section>
	</div>
	<?php
}

/**
 * Receives a ready-made version of the 360° photo. The browser of the owner
 * makes these versions (4096 and 8192 pixels wide), so this also works on
 * hosting with little memory for image processing.
 */
function psarah_ajax_pano_variant() {
	check_ajax_referer( 'psarah_pano', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => __( 'Je hebt geen toegang om dit te doen.', 'pizzeria-sarah' ) ), 403 );
	}
	$image_id = psarah_clean_attachment( isset( $_POST['image'] ) ? wp_unslash( $_POST['image'] ) : 0, 'image' );
	$width    = isset( $_POST['width'] ) ? absint( $_POST['width'] ) : 0;
	$file     = isset( $_FILES['file'] ) ? $_FILES['file'] : null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- checked below
	if ( ! $image_id || $width < 1024 || $width > 8192 || ! $file || ! empty( $file['error'] ) || empty( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
		wp_send_json_error( array( 'message' => __( 'De foto kon niet worden opgeslagen.', 'pizzeria-sarah' ) ), 400 );
	}
	if ( $file['size'] > 60 * MB_IN_BYTES ) {
		wp_send_json_error( array( 'message' => __( 'Deze versie van de foto is te groot.', 'pizzeria-sarah' ) ), 400 );
	}
	$info     = wp_getimagesize( $file['tmp_name'] );
	$original = psarah_original_size( $image_id );
	$types    = array(
		'image/webp' => 'webp',
		'image/jpeg' => 'jpg',
	);
	if ( ! $info || ! isset( $types[ $info['mime'] ] ) || (int) $info[0] !== $width || ! $original
		|| abs( $info[0] / $info[1] - $original['w'] / $original['h'] ) > 0.02 ) {
		wp_send_json_error( array( 'message' => __( 'Deze versie van de foto klopt niet.', 'pizzeria-sarah' ) ), 400 );
	}

	$dir = psarah_upload_dir();
	if ( ! wp_mkdir_p( $dir['dir'] ) ) {
		wp_send_json_error( array( 'message' => __( 'De map voor uploads is niet beschrijfbaar.', 'pizzeria-sarah' ) ), 500 );
	}
	if ( ! file_exists( $dir['dir'] . '/index.php' ) ) {
		file_put_contents( $dir['dir'] . '/index.php', "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	}
	$name = sprintf( '360-%d-%d-%s.%s', $image_id, $width, strtolower( wp_generate_password( 8, false, false ) ), $types[ $info['mime'] ] );
	if ( ! move_uploaded_file( $file['tmp_name'], $dir['dir'] . '/' . $name ) ) { // phpcs:ignore Generic.PHP.ForbiddenFunctions.Found
		wp_send_json_error( array( 'message' => __( 'De foto kon niet worden opgeslagen.', 'pizzeria-sarah' ) ), 500 );
	}
	chmod( $dir['dir'] . '/' . $name, 0644 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_chmod
	psarah_store_pano_variant( $image_id, (int) $info[0], (int) $info[1], $name );

	wp_send_json_success( array( 'variants' => psarah_pano_variants( $image_id ) ) );
}
add_action( 'wp_ajax_psarah_pano_variant', 'psarah_ajax_pano_variant' );
