<?php
/**
 * Removes the settings and the ready-made 360° versions when the plugin is deleted.
 * Images in the media library stay where they are.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$psarah_variants = get_option( 'psarah_pano_variants', array() );
$psarah_uploads  = wp_upload_dir( null, false );
$psarah_dir      = trailingslashit( $psarah_uploads['basedir'] ) . 'pizzeria-sarah';
if ( is_array( $psarah_variants ) ) {
	foreach ( $psarah_variants as $psarah_list ) {
		foreach ( (array) $psarah_list as $psarah_variant ) {
			if ( ! empty( $psarah_variant['file'] ) ) {
				wp_delete_file( $psarah_dir . '/' . basename( $psarah_variant['file'] ) );
			}
		}
	}
}
wp_delete_file( $psarah_dir . '/index.php' );
if ( is_dir( $psarah_dir ) ) {
	@rmdir( $psarah_dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors,WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- only when empty
}

delete_option( 'psarah_settings' );
delete_option( 'psarah_pano_variants' );
delete_post_meta_by_key( '_psarah_sphere' );
