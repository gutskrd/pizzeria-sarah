/**
 * Block editor: "Menukaart-folder" and "360° rondkijken". The editor shows the
 * real folder or photo (rendered by the server), with a few simple choices in
 * the sidebar and a link to the settings.
 */
( function ( wp ) {
	if ( ! wp || ! wp.blocks ) {
		return;
	}
	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var PanelBody = wp.components.PanelBody;
	var SelectControl = wp.components.SelectControl;
	var TextControl = wp.components.TextControl;
	var ExternalLink = wp.components.ExternalLink;
	var ServerSideRender = wp.serverSideRender;
	var settingsUrl = ( window.psarahBlocks && window.psarahBlocks.settingsUrl ) || '';

	function preview( name, attributes ) {
		// Clicks select the block instead of following the link inside it.
		return el( 'div', { style: { pointerEvents: 'none' } }, el( ServerSideRender, { block: name, attributes: attributes } ) );
	}

	function settingsLink( text ) {
		return el( 'p', null, el( ExternalLink, { href: settingsUrl }, text ) );
	}

	wp.blocks.registerBlockType( 'pizzeria-sarah/folder', {
		edit: function ( props ) {
			var a = props.attributes;
			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Weergave' },
						el( SelectControl, {
							label: 'Plaats',
							value: a.uitlijning,
							options: [
								{ label: 'In het midden', value: 'midden' },
								{ label: 'Links', value: 'links' },
								{ label: 'Rechts', value: 'rechts' },
							],
							onChange: function ( v ) {
								props.setAttributes( { uitlijning: v } );
							},
							__nextHasNoMarginBottom: true,
						} ),
						el( 'div', { style: { height: 16 } } ),
						el( SelectControl, {
							label: 'Kleur van de tekst eronder',
							help: 'Kies wit als de folder op een donkere achtergrond staat.',
							value: a.kleur,
							options: [
								{ label: 'Donker (voor een lichte achtergrond)', value: 'licht' },
								{ label: 'Wit (voor een donkere achtergrond)', value: 'donker' },
							],
							onChange: function ( v ) {
								props.setAttributes( { kleur: v } );
							},
							__nextHasNoMarginBottom: true,
						} ),
						settingsLink( 'Afbeeldingen en vouwlijnen aanpassen' )
					)
				),
				el( 'div', useBlockProps(), preview( 'pizzeria-sarah/folder', a ) )
			);
		},
		save: function () {
			return null;
		},
	} );

	wp.blocks.registerBlockType( 'pizzeria-sarah/panorama', {
		edit: function ( props ) {
			var a = props.attributes;
			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: 'Weergave' },
						el( TextControl, {
							label: 'Tekst op de foto',
							help: 'Leeg laten voor de tekst uit de instellingen.',
							value: a.titel,
							onChange: function ( v ) {
								props.setAttributes( { titel: v } );
							},
							__nextHasNoMarginBottom: true,
						} ),
						el( 'div', { style: { height: 16 } } ),
						el( SelectControl, {
							label: 'Hoogte',
							value: a.hoogte,
							options: [
								{ label: 'Laag', value: 'laag' },
								{ label: 'Normaal', value: 'normaal' },
								{ label: 'Hoog', value: 'hoog' },
							],
							onChange: function ( v ) {
								props.setAttributes( { hoogte: v } );
							},
							__nextHasNoMarginBottom: true,
						} ),
						settingsLink( '360°-foto en beginbeeld aanpassen' )
					)
				),
				el( 'div', useBlockProps(), preview( 'pizzeria-sarah/panorama', a ) )
			);
		},
		save: function () {
			return null;
		},
	} );
} )( window.wp );
