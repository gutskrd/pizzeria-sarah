/**
 * Pizzeria Sarah – the settings page "Folder & 360°".
 *
 * Choosing images goes through the normal WordPress media library. The fold
 * lines are found automatically and can be dragged. The 360° photo is made
 * ready here, in the browser: a lighter version for phones (4096 pixels wide)
 * and a sharp one for tablets and computers (8192), so even hosting with
 * little memory has no trouble with a large photo.
 */
( function () {
	'use strict';
	var cfg = window.psarahAdmin;
	var form = document.getElementById( 'ps-form' );
	if ( ! cfg || ! form || ! window.wp || ! wp.media ) {
		return;
	}
	var esc = window.PSarah.escapeHtml;
	var limits = cfg.limits;
	var state = {
		binnen: cfg.media.binnen,
		buiten: cfg.media.buiten,
		pdf: cfg.media.pdf,
		pano: cfg.media.pano,
		variants: cfg.variants || [],
		cuts: {
			binnen: cfg.settings.folder.cuts_binnen.map( Number ),
			buiten: cfg.settings.folder.cuts_buiten.map( Number ),
		},
	};
	var SIDE_TEXT = {
		binnen: { title: 'Binnenkant', pick: 'Kies de binnenkant', names: [ '1', '2', '3' ] },
		buiten: { title: 'Buitenkant', pick: 'Kies de buitenkant', names: [ '1', '2', 'Voorkant' ] },
	};

	function $( selector, root ) {
		return ( root || document ).querySelector( selector );
	}
	function pct( n ) {
		return ( n * 100 ).toFixed( 1 ).replace( '.', ',' ) + '%';
	}

	/* ── Unsaved changes ── */
	var dirty = false;
	function markDirty() {
		dirty = true;
		$( '[data-dirty]' ).hidden = false;
	}
	form.addEventListener( 'input', markDirty );
	form.addEventListener( 'change', function () {
		markDirty();
		updateStatus();
	} );
	form.addEventListener( 'submit', function () {
		dirty = false;
	} );
	window.addEventListener( 'beforeunload', function ( e ) {
		if ( dirty ) {
			e.preventDefault();
			e.returnValue = '';
		}
	} );

	/* ── Media library ── */
	function chooseMedia( options, done ) {
		var frame = wp.media( {
			title: options.title,
			button: { text: options.button || 'Gebruik deze' },
			library: { type: options.type },
			multiple: false,
		} );
		frame.on( 'select', function () {
			done( frame.state().get( 'selection' ).first().toJSON() );
		} );
		frame.open();
	}

	/** The sizes WordPress made of an image with the same shape, small to large. */
	function sourcesOf( att ) {
		var ratio = att.width / att.height;
		var byWidth = {};
		[ 'medium_large', 'large', '1536x1536', '2048x2048', 'full' ].forEach( function ( key ) {
			var s = att.sizes && att.sizes[ key ];
			if ( s && s.width && s.height && Math.abs( s.width / s.height - ratio ) <= 0.02 ) {
				byWidth[ s.width ] = { url: s.url, w: s.width, h: s.height };
			}
		} );
		var list = Object.keys( byWidth )
			.map( Number )
			.sort( function ( a, b ) {
				return a - b;
			} )
			.map( function ( w ) {
				return byWidth[ w ];
			} );
		return list.length ? list : [ { url: att.url, w: att.width, h: att.height } ];
	}

	function largest( att ) {
		var list = sourcesOf( att );
		return list[ list.length - 1 ];
	}

	/* ── Fold lines ── */

	/**
	 * Finds the fold lines: on a printed folder there is usually a plain strip
	 * along each fold. Looks for the widest calm strip near 1/3 and 2/3 of the
	 * width (same method as the website).
	 */
	function detectCuts( url ) {
		return new Promise( function ( resolve ) {
			var img = new Image();
			img.onload = function () {
				try {
					var w = 600;
					var h = Math.max( 1, Math.round( ( img.naturalHeight * w ) / img.naturalWidth ) );
					var canvas = document.createElement( 'canvas' );
					canvas.width = w;
					canvas.height = h;
					var ctx = canvas.getContext( '2d', { willReadFrequently: true } );
					ctx.drawImage( img, 0, 0, w, h );
					var px = ctx.getImageData( 0, 0, w, h ).data;
					var grey = new Float32Array( w * h );
					for ( var i = 0; i < w * h; i++ ) {
						grey[ i ] = 0.299 * px[ i * 4 ] + 0.587 * px[ i * 4 + 1 ] + 0.114 * px[ i * 4 + 2 ];
					}
					var activity = new Float64Array( w );
					for ( var x = 1; x < w; x++ ) {
						var sum = 0;
						for ( var y = 0; y < h; y++ ) {
							sum += Math.abs( grey[ y * w + x ] - grey[ y * w + x - 1 ] ) + ( y > 0 ? Math.abs( grey[ y * w + x ] - grey[ ( y - 1 ) * w + x ] ) : 0 );
						}
						activity[ x ] = sum / h;
					}
					var smooth = function ( x ) {
						return ( activity[ x - 1 ] + activity[ x ] + activity[ x + 1 ] ) / 3;
					};
					var find = function ( target ) {
						var from = Math.max( 2, Math.round( w * ( target - 0.06 ) ) );
						var to = Math.min( w - 3, Math.round( w * ( target + 0.06 ) ) );
						var min = Infinity;
						for ( var a = from; a <= to; a++ ) {
							min = Math.min( min, smooth( a ) );
						}
						var limit = min + 4;
						var best = { width: 0, center: w * target };
						var runStart = -1;
						for ( var b = from; b <= to + 1; b++ ) {
							var calm = b <= to && smooth( b ) <= limit;
							if ( calm && runStart < 0 ) {
								runStart = b;
							}
							if ( ! calm && runStart >= 0 ) {
								var run = { width: b - runStart, center: ( runStart + b - 1 ) / 2 };
								var closer = Math.abs( run.center - w * target ) < Math.abs( best.center - w * target );
								if ( run.width > best.width + 2 || ( Math.abs( run.width - best.width ) <= 2 && closer ) ) {
									best = run;
								}
								runStart = -1;
							}
						}
						return best.center / w;
					};
					var cuts = [ find( 1 / 3 ), find( 2 / 3 ) ];
					resolve( validCuts( cuts ) ? cuts : [ 1 / 3, 2 / 3 ] );
				} catch ( e ) {
					resolve( [ 1 / 3, 2 / 3 ] );
				}
			};
			img.onerror = function () {
				resolve( [ 1 / 3, 2 / 3 ] );
			};
			img.src = url;
		} );
	}

	function validCuts( c ) {
		return c[ 0 ] >= limits.minCut && c[ 1 ] <= limits.maxCut && c[ 1 ] - c[ 0 ] >= limits.minPanel;
	}

	function setCut( side, index, value ) {
		var next = state.cuts[ side ].slice();
		if ( index === 0 ) {
			next[ 0 ] = Math.min( Math.max( value, limits.minCut ), next[ 1 ] - limits.minPanel );
		} else {
			next[ 1 ] = Math.max( Math.min( value, limits.maxCut ), next[ 0 ] + limits.minPanel );
		}
		state.cuts[ side ] = [ Math.round( next[ 0 ] * 1000 ) / 1000, Math.round( next[ 1 ] * 1000 ) / 1000 ];
		$( '.ps-side[data-side="' + side + '"] [data-field="cuts"]' ).value = state.cuts[ side ].join( ',' );
		positionLines( side );
		markDirty();
	}

	function positionLines( side ) {
		var root = $( '.ps-side[data-side="' + side + '"]' );
		var cuts = state.cuts[ side ];
		var parts = [ cuts[ 0 ], cuts[ 1 ] - cuts[ 0 ], 1 - cuts[ 1 ] ];
		Array.prototype.forEach.call( root.querySelectorAll( '[data-line]' ), function ( line ) {
			line.style.left = cuts[ Number( line.getAttribute( 'data-line' ) ) ] * 100 + '%';
		} );
		Array.prototype.forEach.call( root.querySelectorAll( '[data-label]' ), function ( label, i ) {
			label.style.width = parts[ i ] * 100 + '%';
		} );
		Array.prototype.forEach.call( root.querySelectorAll( 'input[type="range"]' ), function ( range ) {
			var i = Number( range.getAttribute( 'data-range' ) );
			range.value = ( cuts[ i ] * 100 ).toFixed( 1 );
			var out = root.querySelector( '[data-value="' + i + '"]' );
			if ( out ) {
				out.textContent = pct( cuts[ i ] );
			}
		} );
	}

	function pickSide( side ) {
		chooseMedia( { title: SIDE_TEXT[ side ].pick + ' van de folder', button: 'Gebruik deze afbeelding', type: 'image' }, function ( att ) {
			if ( att.width && att.height && att.width <= att.height ) {
				window.alert( 'Kies een liggende afbeelding van de hele open folder: alle drie de delen naast elkaar.' );
				return;
			}
			state[ side ] = att;
			$( '.ps-side[data-side="' + side + '"] [data-field="id"]' ).value = att.id;
			markDirty();
			renderSide( side );
			var root = $( '.ps-side[data-side="' + side + '"]' );
			var note = root.querySelector( '[data-detect]' );
			if ( note ) {
				note.textContent = 'Vouwlijnen zoeken…';
			}
			detectCuts( largest( att ).url ).then( function ( cuts ) {
				state.cuts[ side ] = [ Math.round( cuts[ 0 ] * 1000 ) / 1000, Math.round( cuts[ 1 ] * 1000 ) / 1000 ];
				$( '.ps-side[data-side="' + side + '"] [data-field="cuts"]' ).value = state.cuts[ side ].join( ',' );
				positionLines( side );
				if ( note ) {
					note.textContent = 'Vouwlijnen gevonden. Staan ze niet precies op de vouw? Versleep de gele lijnen.';
				}
				updateStatus();
			} );
		} );
	}

	function renderSide( side ) {
		var root = $( '.ps-side[data-side="' + side + '"]' );
		var body = root.querySelector( '[data-body]' );
		var att = state[ side ];
		var text = SIDE_TEXT[ side ];
		if ( ! att ) {
			body.innerHTML =
				'<button type="button" class="ps-drop" data-pick>' +
				'<span class="dashicons dashicons-format-image" aria-hidden="true"></span>' +
				'<strong>' + esc( text.pick ) + '</strong><span>JPG, PNG of WebP, liggend</span></button>';
		} else {
			var src = largest( att ).url;
			var labels = text.names
				.map( function ( name, i ) {
					return '<span data-label="' + i + '"><span>' + esc( name ) + '</span></span>';
				} )
				.join( '' );
			var lines = [ 0, 1 ]
				.map( function ( i ) {
					return '<div class="ps-line" data-line="' + i + '" aria-hidden="true"><span class="ps-line__bar"></span><span class="ps-line__knob"></span></div>';
				} )
				.join( '' );
			var ranges = [ 0, 1 ]
				.map( function ( i ) {
					var name = i === 0 ? 'links' : 'rechts';
					return (
						'<label class="ps-range"><span class="ps-range__head"><span>Vouwlijn ' + name + '</span><span class="ps-muted" data-value="' + i + '"></span></span>' +
						'<input type="range" min="' + limits.minCut * 100 + '" max="' + limits.maxCut * 100 + '" step="0.1" data-range="' + i + '" aria-label="' + esc( text.title ) + ': vouwlijn ' + name + '"></label>'
					);
				} )
				.join( '' );
			body.innerHTML =
				'<div class="ps-sheet" data-frame><img src="' + esc( src ) + '" alt="' + esc( text.title ) + ' van de folder" draggable="false">' +
				'<div class="ps-sheet__labels" aria-hidden="true">' + labels + '</div>' + lines + '</div>' +
				'<p class="ps-detect ps-muted" data-detect aria-live="polite"></p>' +
				'<div class="ps-ranges">' + ranges + '</div>' +
				'<div class="ps-row"><button type="button" class="button" data-pick>Andere afbeelding</button>' +
				'<button type="button" class="button-link ps-remove" data-remove>Weghalen</button></div>';

			var frame = body.querySelector( '[data-frame]' );
			Array.prototype.forEach.call( body.querySelectorAll( '[data-line]' ), function ( line ) {
				line.addEventListener( 'pointerdown', function ( e ) {
					e.preventDefault();
					var index = Number( line.getAttribute( 'data-line' ) );
					line.setPointerCapture( e.pointerId );
					line.classList.add( 'is-dragging' );
					var move = function ( ev ) {
						var rect = frame.getBoundingClientRect();
						setCut( side, index, ( ev.clientX - rect.left ) / rect.width );
					};
					var stop = function () {
						line.classList.remove( 'is-dragging' );
						line.removeEventListener( 'pointermove', move );
						line.removeEventListener( 'pointerup', stop );
						line.removeEventListener( 'pointercancel', stop );
					};
					line.addEventListener( 'pointermove', move );
					line.addEventListener( 'pointerup', stop );
					line.addEventListener( 'pointercancel', stop );
				} );
			} );
			Array.prototype.forEach.call( body.querySelectorAll( 'input[type="range"]' ), function ( range ) {
				range.addEventListener( 'input', function () {
					setCut( side, Number( range.getAttribute( 'data-range' ) ), Number( range.value ) / 100 );
				} );
			} );
			body.querySelector( '[data-remove]' ).addEventListener( 'click', function () {
				state[ side ] = null;
				root.querySelector( '[data-field="id"]' ).value = '0';
				markDirty();
				renderSide( side );
				updateStatus();
			} );
			positionLines( side );
		}
		body.querySelector( '[data-pick]' ).addEventListener( 'click', function () {
			pickSide( side );
		} );
		updateStatus();
	}

	/* ── PDF ── */
	function renderPdf() {
		var box = $( '[data-pdf]' );
		var input = $( '[data-pdf-id]' );
		if ( state.pdf ) {
			box.innerHTML =
				'<span class="ps-file"><span class="dashicons dashicons-pdf" aria-hidden="true"></span>' +
				'<a href="' + esc( state.pdf.url ) + '" target="_blank" rel="noopener">' + esc( state.pdf.filename ) + '</a></span>' +
				'<button type="button" class="button" data-pick-pdf>Andere pdf</button>' +
				'<button type="button" class="button-link ps-remove" data-remove-pdf>Weghalen</button>';
			box.querySelector( '[data-remove-pdf]' ).addEventListener( 'click', function () {
				state.pdf = null;
				input.value = '0';
				markDirty();
				renderPdf();
			} );
		} else {
			box.innerHTML = '<button type="button" class="button" data-pick-pdf>Kies een pdf</button>';
		}
		box.querySelector( '[data-pick-pdf]' ).addEventListener( 'click', function () {
			chooseMedia( { title: 'Kies de menukaart als pdf', button: 'Gebruik deze pdf', type: 'application/pdf' }, function ( att ) {
				state.pdf = att;
				input.value = att.id;
				markDirty();
				renderPdf();
			} );
		} );
	}

	/* ── Folder status and preview ── */
	function folderData() {
		if ( ! state.binnen || ! state.buiten ) {
			return null;
		}
		var ratio = 0;
		var sides = {};
		[ 'binnen', 'buiten' ].forEach( function ( side ) {
			var sources = sourcesOf( state[ side ] );
			var big = sources[ sources.length - 1 ];
			var c = state.cuts[ side ];
			[ c[ 0 ], c[ 1 ] - c[ 0 ], 1 - c[ 1 ] ].forEach( function ( part ) {
				ratio += ( part * big.w ) / big.h;
			} );
			sides[ side ] = { cuts: c.slice(), sources: sources };
		} );
		var label = $( '#ps-folder-label' ).value.trim();
		return {
			label: label,
			title: label ? 'Menukaart · ' + label : 'Menukaart',
			panelRatio: ratio / 6,
			sides: sides,
			textUrl: $( '#ps-folder-text' ).value.trim(),
			pdfUrl: state.pdf ? state.pdf.url : '',
		};
	}

	function setBadge( el, text, tone ) {
		el.textContent = text;
		el.setAttribute( 'data-tone', tone );
	}

	function updateStatus() {
		var folderVisible = $( 'input[type="checkbox"][name$="[folder][visible]"]' ).checked;
		var complete = Boolean( state.binnen && state.buiten );
		var badge = $( '[data-folder-status]' );
		if ( ! state.binnen && ! state.buiten ) {
			setBadge( badge, 'Nog geen folder', 'warning' );
		} else if ( ! complete ) {
			setBadge( badge, 'Nog niet compleet', 'warning' );
		} else if ( folderVisible ) {
			setBadge( badge, 'Op de website', 'ok' );
		} else {
			setBadge( badge, 'Verborgen', 'muted' );
		}
		$( '[data-folder-preview]' ).disabled = ! complete;

		var panoVisible = $( 'input[type="checkbox"][name$="[pano][visible]"]' ).checked;
		var panoBadge = $( '[data-pano-status]' );
		if ( ! state.pano ) {
			setBadge( panoBadge, 'Nog geen foto', 'warning' );
		} else if ( panoVisible ) {
			setBadge( panoBadge, 'Op de website', 'ok' );
		} else {
			setBadge( panoBadge, 'Verborgen', 'muted' );
		}
	}

	$( '[data-folder-preview]' ).addEventListener( 'click', function () {
		var data = folderData();
		if ( data && window.PSarahFolder ) {
			window.PSarahFolder.open( data );
		}
	} );

	/* ── 360° photo ── */
	var viewer = null;

	function panoSize( att ) {
		return {
			w: att.originalWidth || att.width,
			h: att.originalHeight || att.height,
		};
	}

	/** Which ready-made versions this photo needs. */
	function targetWidths( att ) {
		var size = panoSize( att );
		var small = cfg.widths[ 0 ];
		var large = cfg.widths[ 1 ];
		if ( size.w <= small ) {
			return [ size.w ];
		}
		return [ small, Math.min( size.w, large ) ];
	}

	function variantsComplete( att ) {
		var have = state.variants.map( function ( v ) {
			return v.w;
		} );
		return targetWidths( att ).every( function ( w ) {
			return have.indexOf( w ) >= 0;
		} );
	}

	/** The sharpest version for the preview here. */
	function previewUrl( att ) {
		if ( state.variants.length ) {
			return state.variants[ state.variants.length - 1 ].url;
		}
		var size = panoSize( att );
		return size.w <= 8192 ? att.originalImageURL || att.url : att.url;
	}

	function resize( source, width, height ) {
		var viaBitmap = window.createImageBitmap
			? createImageBitmap( source, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' } ).then( function ( bmp ) {
					if ( bmp.width !== width ) {
						throw new Error( 'size' );
					}
					return bmp;
			  } )
			: Promise.reject( new Error( 'none' ) );
		return viaBitmap
			.catch( function () {
				// Step down by halves for a smooth result.
				var current = source;
				var w = source.width;
				var h = source.height;
				while ( w / 2 > width ) {
					w = Math.round( w / 2 );
					h = Math.round( h / 2 );
					var step = document.createElement( 'canvas' );
					step.width = w;
					step.height = h;
					var sctx = step.getContext( '2d' );
					sctx.imageSmoothingQuality = 'high';
					sctx.drawImage( current, 0, 0, w, h );
					current = step;
				}
				return current;
			} )
			.then( function ( img ) {
				var canvas = document.createElement( 'canvas' );
				canvas.width = width;
				canvas.height = height;
				var ctx = canvas.getContext( '2d' );
				if ( ! ctx ) {
					throw new Error( 'canvas' );
				}
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage( img, 0, 0, width, height );
				if ( img.close ) {
					img.close();
				}
				return canvas;
			} );
	}

	function encode( canvas ) {
		var toBlob = function ( type, quality ) {
			return new Promise( function ( resolve ) {
				canvas.toBlob( resolve, type, quality );
			} );
		};
		return toBlob( 'image/webp', 0.86 ).then( function ( blob ) {
			if ( blob && blob.type === 'image/webp' ) {
				return blob;
			}
			return toBlob( 'image/jpeg', 0.88 );
		} ).then( function ( blob ) {
			// Free the memory of the canvas straight away.
			canvas.width = 1;
			canvas.height = 1;
			if ( ! blob ) {
				throw new Error( 'encode' );
			}
			return blob;
		} );
	}

	function upload( att, width, blob ) {
		var data = new FormData();
		data.append( 'action', 'psarah_pano_variant' );
		data.append( 'nonce', cfg.nonce );
		data.append( 'image', att.id );
		data.append( 'width', width );
		data.append( 'file', blob, '360-' + width + ( blob.type === 'image/webp' ? '.webp' : '.jpg' ) );
		return fetch( cfg.ajaxUrl, { method: 'POST', body: data, credentials: 'same-origin' } )
			.then( function ( res ) {
				return res.json().catch( function () {
					return { success: false };
				} );
			} )
			.then( function ( json ) {
				if ( ! json || ! json.success ) {
					throw new Error( ( json && json.data && json.data.message ) || 'De foto kon niet worden opgeslagen.' );
				}
				return json.data.variants;
			} );
	}

	var preparing = false;
	function prepareVariants( att ) {
		if ( preparing ) {
			return;
		}
		preparing = true;
		var size = panoSize( att );
		var widths = targetWidths( att ).filter( function ( w ) {
			return ! state.variants.some( function ( v ) {
				return v.w === w;
			} );
		} );
		setVariantStatus( 'busy', 'De foto wordt klaargemaakt voor telefoon, tablet en computer… Laat deze pagina even open.' );
		var source = null;
		fetch( att.originalImageURL || att.url, { credentials: 'same-origin' } )
			.then( function ( res ) {
				if ( ! res.ok ) {
					throw new Error( 'download' );
				}
				return res.blob();
			} )
			.then( function ( blob ) {
				return window.createImageBitmap ? createImageBitmap( blob ) : Promise.reject( new Error( 'bitmap' ) );
			} )
			.then( function ( bitmap ) {
				source = bitmap;
				var chain = Promise.resolve();
				var done = 0;
				var failed = [];
				widths.forEach( function ( w ) {
					chain = chain.then( function () {
						var h = Math.round( ( w * size.h ) / size.w );
						setVariantStatus( 'busy', 'Bezig met versie ' + ( done + 1 ) + ' van ' + widths.length + ' (' + w + ' pixels breed)… Laat deze pagina even open.' );
						return resize( source, w, h )
							.then( encode )
							.then( function ( blob ) {
								return upload( att, w, blob );
							} )
							.then( function ( variants ) {
								state.variants = variants;
								done++;
							} )
							.catch( function () {
								failed.push( w );
							} );
					} );
				} );
				return chain.then( function () {
					return failed;
				} );
			} )
			.then( function ( failed ) {
				if ( failed.length && ! state.variants.length ) {
					throw new Error( 'all' );
				}
				setVariantStatus(
					'ok',
					failed.length
						? 'Klaar voor telefoons. De extra scherpe versie voor grote schermen lukte in deze browser niet; probeer het eventueel op een computer met Chrome.'
						: 'Klaar voor telefoon, tablet en computer.'
				);
				if ( viewer ) {
					startViewer( att );
				}
			} )
			.catch( function () {
				setVariantStatus( 'error', 'Het klaarmaken lukte niet in deze browser. De foto werkt wel, maar laadt op telefoons trager. Probeer het opnieuw op een computer met Chrome, Edge of Firefox.', true );
			} )
			.then( function () {
				if ( source && source.close ) {
					source.close();
				}
				preparing = false;
			} );
	}

	function setVariantStatus( tone, text, retry ) {
		var box = $( '[data-variants]' );
		if ( ! box ) {
			return;
		}
		box.setAttribute( 'data-tone', tone );
		box.innerHTML =
			( tone === 'busy' ? '<span class="spinner is-active" aria-hidden="true"></span>' : '<span class="dashicons dashicons-' + ( tone === 'ok' ? 'yes-alt' : 'warning' ) + '" aria-hidden="true"></span>' ) +
			'<span>' + esc( text ) + '</span>' +
			( retry ? ' <button type="button" class="button button-small" data-retry>Opnieuw proberen</button>' : '' );
		var again = box.querySelector( '[data-retry]' );
		if ( again ) {
			again.addEventListener( 'click', function () {
				prepareVariants( state.pano );
			} );
		}
	}

	function startViewer( att ) {
		var box = $( '[data-pano-viewer]' );
		if ( ! box || ! window.pannellum ) {
			return;
		}
		if ( viewer ) {
			try {
				viewer.destroy();
			} catch ( e ) {}
		}
		var size = panoSize( att );
		var config = {
			type: 'equirectangular',
			panorama: previewUrl( att ),
			autoLoad: true,
			yaw: Number( $( '[data-pano-yaw]' ).value ) || 0,
			pitch: Number( $( '[data-pano-pitch]' ).value ) || 0,
			hfov: Number( $( '[data-pano-hfov]' ).value ) || 100,
			minHfov: 40,
			maxHfov: 120,
			showFullscreenCtrl: false,
			compass: false,
			ignoreGPanoXMP: true,
			strings: { loadingLabel: 'Laden…', loadButtonLabel: 'Laden' },
		};
		if ( size.w / size.h > 2.05 ) {
			config.haov = 360;
			config.vaov = 360 / ( size.w / size.h );
			config.avoidShowingBackground = true;
		}
		viewer = window.pannellum.viewer( box, config );
	}

	function drawPano() {
		var body = $( '[data-pano-body]' );
		var att = state.pano;
		if ( viewer ) {
			try {
				viewer.destroy();
			} catch ( e ) {}
			viewer = null;
		}
		if ( ! att ) {
			body.innerHTML =
				'<button type="button" class="ps-drop ps-drop--wide" data-pick-pano>' +
				'<span class="dashicons dashicons-format-image" aria-hidden="true"></span>' +
				'<strong>Kies een 360°-foto</strong><span>JPG of WebP, twee keer zo breed als hoog</span></button>';
		} else {
			var size = panoSize( att );
			var ratio = size.w / size.h;
			var warning = '';
			if ( ratio < 1.95 ) {
				warning = '<p class="ps-notice ps-notice--warning">Deze foto lijkt geen 360°-foto: hij is ' + size.w + ' × ' + size.h + ' pixels. Een 360°-foto is twee keer zo breed als hoog, bijvoorbeeld 6000 × 3000.</p>';
			} else if ( size.w < 3000 ) {
				warning = '<p class="ps-notice ps-notice--warning">Deze foto is vrij klein (' + size.w + ' pixels breed) en kan onscherp ogen. Gebruik als het kan de originele foto van de 360°-camera.</p>';
			}
			body.innerHTML =
				warning +
				'<div class="ps-viewer" data-pano-viewer></div>' +
				'<div class="ps-row ps-row--view">' +
				'<button type="button" class="button button-primary" data-set-view>Gebruik dit als beginbeeld</button>' +
				'<button type="button" class="button" data-show-view>Naar het beginbeeld</button>' +
				'<span class="ps-muted" data-view-note aria-live="polite">Sleep in de foto om rond te kijken, scroll om te zoomen.</span></div>' +
				'<p class="ps-variants" data-variants></p>' +
				'<div class="ps-row"><button type="button" class="button" data-pick-pano>Andere foto</button>' +
				'<button type="button" class="button-link ps-remove" data-remove-pano>Weghalen</button></div>';

			body.querySelector( '[data-set-view]' ).addEventListener( 'click', function () {
				if ( ! viewer ) {
					return;
				}
				$( '[data-pano-yaw]' ).value = viewer.getYaw().toFixed( 2 );
				$( '[data-pano-pitch]' ).value = viewer.getPitch().toFixed( 2 );
				$( '[data-pano-hfov]' ).value = viewer.getHfov().toFixed( 2 );
				$( '[data-view-note]' ).textContent = 'Beginbeeld ingesteld. Vergeet niet op te slaan.';
				markDirty();
			} );
			body.querySelector( '[data-show-view]' ).addEventListener( 'click', function () {
				if ( viewer ) {
					viewer.lookAt( Number( $( '[data-pano-pitch]' ).value ), Number( $( '[data-pano-yaw]' ).value ), Number( $( '[data-pano-hfov]' ).value ), 800 );
				}
			} );
			body.querySelector( '[data-remove-pano]' ).addEventListener( 'click', function () {
				state.pano = null;
				state.variants = [];
				$( '[data-pano-id]' ).value = '0';
				markDirty();
				renderPano();
			} );
			startViewer( att );
			if ( variantsComplete( att ) ) {
				setVariantStatus( 'ok', 'Klaar voor telefoon, tablet en computer.' );
			} else {
				prepareVariants( att );
			}
		}
		body.querySelector( '[data-pick-pano]' ).addEventListener( 'click', function () {
			chooseMedia( { title: 'Kies de 360°-foto', button: 'Gebruik deze foto', type: 'image' }, function ( att ) {
				state.pano = att;
				state.variants = [];
				$( '[data-pano-id]' ).value = att.id;
				$( '[data-pano-yaw]' ).value = '0';
				$( '[data-pano-pitch]' ).value = '0';
				$( '[data-pano-hfov]' ).value = '100';
				markDirty();
				renderPano();
			} );
		} );
		updateStatus();
	}

	/* ── Copy buttons ── */
	Array.prototype.forEach.call( document.querySelectorAll( '[data-copy]' ), function ( button ) {
		button.addEventListener( 'click', function () {
			var text = button.getAttribute( 'data-copy' );
			var done = function () {
				var old = button.textContent;
				button.textContent = 'Gekopieerd';
				setTimeout( function () {
					button.textContent = old;
				}, 1600 );
			};
			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( text ).then( done, function () {} );
			} else {
				window.prompt( 'Kopieer deze code:', text );
			}
		} );
	} );

	/** A photo that WordPress scaled down keeps its original next to it: find out how large that is. */
	function withOriginalSize( att ) {
		if ( att.originalWidth ) {
			return Promise.resolve( att );
		}
		if ( ! att.originalImageURL || att.originalImageURL === att.url ) {
			att.originalWidth = att.width;
			att.originalHeight = att.height;
			return Promise.resolve( att );
		}
		return new Promise( function ( resolve ) {
			var img = new Image();
			img.onload = function () {
				att.originalWidth = img.naturalWidth;
				att.originalHeight = img.naturalHeight;
				resolve( att );
			};
			img.onerror = function () {
				att.originalWidth = att.width;
				att.originalHeight = att.height;
				resolve( att );
			};
			img.src = att.originalImageURL;
		} );
	}

	function renderPano() {
		if ( state.pano && ! state.pano.originalWidth ) {
			$( '[data-pano-body]' ).innerHTML = '<p class="ps-muted"><span class="spinner is-active ps-inline-spinner"></span> Foto bekijken…</p>';
			withOriginalSize( state.pano ).then( drawPano );
			return;
		}
		drawPano();
	}

	renderSide( 'binnen' );
	renderSide( 'buiten' );
	renderPdf();
	renderPano();
	updateStatus();
} )();
