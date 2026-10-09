<?php
/**
 * Plugin Name:       Pizzeria Sarah – Menukaart-folder en 360°-foto
 * Description:       De menukaart als folder die in 3D openvouwt, en een 360°-foto waarin bezoekers rondkijken in de pizzeria. Werkt op telefoon, tablet en computer.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Zagrosian
 * Author URI:        https://zagrosian.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pizzeria-sarah
 */

defined( 'ABSPATH' ) || exit;

define( 'PSARAH_VERSION', '1.0.0' );
define( 'PSARAH_FILE', __FILE__ );
define( 'PSARAH_DIR', plugin_dir_path( __FILE__ ) );
define( 'PSARAH_URL', plugin_dir_url( __FILE__ ) );

require PSARAH_DIR . 'includes/settings.php';
require PSARAH_DIR . 'includes/images.php';
require PSARAH_DIR . 'includes/folder.php';
require PSARAH_DIR . 'includes/panorama.php';
require PSARAH_DIR . 'includes/assets.php';
require PSARAH_DIR . 'includes/blocks.php';

if ( is_admin() ) {
	require PSARAH_DIR . 'includes/admin.php';
}

/** A link to the settings straight from the plugin list. */
add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	static function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=pizzeria-sarah' ) ) . '">' . esc_html__( 'Instellingen', 'pizzeria-sarah' ) . '</a>' );
		return $links;
	}
);
