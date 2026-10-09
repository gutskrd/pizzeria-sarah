/**
 * Pizzeria Sarah – the menu folder.
 *
 * A tap on the folded leaflet opens a full-screen view in which it unfolds in
 * 3D (cover first, then the inner flap). It can be turned over to see the
 * outside, and zoomed in: pinch or double-tap on a phone or tablet, scroll or
 * double-click with a mouse, or the + and − buttons.
 */
( function () {
	'use strict';
	var PS = window.PSarah;
	if ( ! PS ) {
		return;
	}

	var CLOSE_MS = 1330; // the inner flap folds back, then the cover (see folder.css)
	var MAX_ZOOM = 4;
	var DOUBLE_TAP_MS = 320;

	/** Shows one panel of a sheet: the part between two fold lines. */
	function slice( el, url, from, to ) {
		var part = Math.max( 0.01, to - from );
		el.style.backgroundImage = 'url("' + url.replace( /"/g, '%22' ) + '")';
		el.style.backgroundSize = 100 / part + '% 100%';
		el.style.backgroundPosition = ( part < 0.999 ? ( from / ( 1 - part ) ) * 100 : 0 ) + '% 0';
	}

	function pick( sources, width ) {
		for ( var i = 0; i < sources.length; i++ ) {
			if ( sources[ i ].w >= width ) {
				return sources[ i ];
			}
		}
		return sources[ sources.length - 1 ];
	}

	// Which part of which sheet is on each face. The outside is mirrored when the leaflet is closed.
	var FACES = [
		{ panel: 'links', voor: [ 'binnen', 0 ], achter: [ 'buiten', 2 ] },
		{ panel: 'midden', voor: [ 'binnen', 1 ], achter: [ 'buiten', 1 ] },
		{ panel: 'rechts', voor: [ 'binnen', 2 ], achter: [ 'buiten', 0 ] },
	];

	function FolderView( data ) {
		this.data = data;
		this.side = 'binnen';
		this.opened = false;
		this.closing = false;
		this.timers = [];
		this.zoom = { s: 1, x: 0, y: 0 };
		this.loaded = { binnen: null, buiten: null };
		this.build();
	}

	FolderView.prototype.build = function () {
		var self = this;
		var esc = PS.escapeHtml;
		var data = this.data;
		this.dialog = PS.createDialog( {
			className: 'ps-folder-dialog',
			label: data.label ? 'Menukaart-folder, ' + data.label : 'Menukaart-folder',
			onRequestClose: function () {
				self.hide();
			},
			onClosed: function () {
				self.reset();
			},
		} );
		var el = this.dialog.el;
		var faces = FACES.map( function ( f ) {
			return (
				'<div class="ps-panel" data-panel="' + f.panel + '">' +
				'<div class="ps-face" data-face="voor" data-part="' + f.voor.join( '-' ) + '"></div>' +
				'<div class="ps-face" data-face="achter" data-part="' + f.achter.join( '-' ) + '"></div>' +
				'</div>'
			);
		} ).join( '' );
		var links = '';
		if ( data.textUrl ) {
			links += '<a class="ps-link" data-leave href="' + esc( data.textUrl ) + '">Als tekst lezen</a>';
		}
		if ( data.pdfUrl ) {
			links += '<a class="ps-link" href="' + esc( data.pdfUrl ) + '" target="_blank" rel="noopener" download>Download pdf</a>';
		}
		el.innerHTML =
			'<div class="ps-folder-dialog__inner">' +
			'<div class="ps-dialog__bar"><p class="ps-dialog__title">' + esc( data.title ) + '</p>' +
			'<button type="button" class="ps-btn ps-btn--icon" data-close aria-label="Folder sluiten">' + PS.icons.close + '</button></div>' +
			'<div class="ps-folder-dialog__stage">' +
			'<div class="ps-folder-dialog__zoom"><div class="ps-folder-dialog__perspective"><div class="ps-folder-dialog__box">' +
			'<div class="ps-leaf-shadow" aria-hidden="true"></div>' +
			'<div class="ps-leaf" role="img" data-open="false" data-side="binnen">' + faces + '</div>' +
			'</div></div></div></div>' +
			'<div class="ps-folder-dialog__foot">' +
			'<div class="ps-seg" role="group" aria-label="Kant van de folder">' +
			'<button type="button" class="ps-btn" data-side="binnen" aria-pressed="true">Binnenkant</button>' +
			'<button type="button" class="ps-btn" data-side="buiten" aria-pressed="false">Buitenkant</button></div>' +
			'<div class="ps-zoom-controls">' +
			'<button type="button" class="ps-btn ps-btn--icon" data-zoom="-1" aria-label="Uitzoomen">' + PS.icons.minus + '</button>' +
			'<button type="button" class="ps-btn ps-btn--icon" data-zoom="1" aria-label="Inzoomen">' + PS.icons.plus + '</button></div>' +
			( links ? '<div class="ps-links">' + links + '</div>' : '' ) +
			'<p class="ps-hint" aria-hidden="true"></p>' +
			'</div></div>';

		this.stage = el.querySelector( '.ps-folder-dialog__stage' );
		this.zoomLayer = el.querySelector( '.ps-folder-dialog__zoom' );
		this.box = el.querySelector( '.ps-folder-dialog__box' );
		this.leaf = el.querySelector( '.ps-leaf' );
		this.shadow = el.querySelector( '.ps-leaf-shadow' );
		this.hint = el.querySelector( '.ps-hint' );
		this.sideButtons = el.querySelectorAll( '.ps-seg [data-side]' );
		this.zoomButtons = el.querySelectorAll( '[data-zoom]' );

		el.querySelector( '[data-close]' ).addEventListener( 'click', function () {
			self.hide();
		} );
		Array.prototype.forEach.call( el.querySelectorAll( '.ps-seg [data-side]' ), function ( button ) {
			button.addEventListener( 'click', function () {
				self.setSide( button.getAttribute( 'data-side' ) );
			} );
		} );
		Array.prototype.forEach.call( this.zoomButtons, function ( button ) {
			button.addEventListener( 'click', function () {
				var rect = self.stage.getBoundingClientRect();
				var factor = button.getAttribute( 'data-zoom' ) === '1' ? 1.6 : 1 / 1.6;
				self.zoomTo( self.zoom.s * factor, rect.width / 2, rect.height / 2, true );
			} );
		} );
		var leave = el.querySelector( '[data-leave]' );
		if ( leave ) {
			leave.addEventListener( 'click', function ( e ) {
				if ( e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey ) {
					return;
				}
				// Leave the view at once and go to the menu as text.
				e.preventDefault();
				var href = leave.href;
				self.dialog.close( function () {
					window.location.assign( href );
				} );
			} );
		}
		// A click on the dark area around the leaflet closes the view.
		el.addEventListener( 'click', function ( e ) {
			if ( e.target === el || e.target.classList.contains( 'ps-folder-dialog__inner' ) || e.target.classList.contains( 'ps-folder-dialog__foot' ) ) {
				self.hide();
			}
		} );
		el.addEventListener( 'keydown', function ( e ) {
			self.onKey( e );
		} );
		this.bindGestures();
		window.addEventListener( 'resize', function () {
			if ( self.dialog.isOpen() ) {
				self.measure();
			}
		} );
	};

	FolderView.prototype.later = function ( fn, ms ) {
		this.timers.push( setTimeout( fn, ms ) );
	};

	FolderView.prototype.clearTimers = function () {
		this.timers.forEach( clearTimeout );
		this.timers = [];
	};

	/** Fits the open leaflet on the screen; closed, it shows larger so the cover is easy to see. */
	FolderView.prototype.measure = function () {
		var ratio = this.data.panelRatio * 3;
		var rect = this.stage.getBoundingClientRect();
		var vw = window.innerWidth;
		// On a low screen (a phone held sideways) the close button sits in the corner: keep the sides free.
		var padX = window.innerHeight <= 480 ? 128 : vw < 640 ? 16 : 64;
		var padY = rect.height < 420 ? 12 : 40;
		var availW = Math.max( 120, rect.width - padX );
		var availH = Math.max( 80, rect.height - padY );
		var w = Math.min( availW, availH * ratio, 1800 );
		var h = w / ratio;
		var closedScale = Math.max( 1, Math.min( availH / h, ( vw * 0.62 ) / ( w / 3 ), 2.2 ) );
		this.box.style.width = w + 'px';
		this.box.style.height = h + 'px';
		this.leaf.style.setProperty( '--ps-closed-scale', closedScale );
		this.shadow.style.setProperty( '--ps-closed-scale', closedScale );
		this.boxSize = { w: w, h: h };
		this.applyZoom( 1, 0, 0, false );
		return w;
	};

	/** Puts the right image size on every face. */
	FolderView.prototype.paint = function ( urls ) {
		var data = this.data;
		Array.prototype.forEach.call( this.leaf.querySelectorAll( '.ps-face' ), function ( face ) {
			var part = face.getAttribute( 'data-part' ).split( '-' );
			var side = part[ 0 ];
			var index = Number( part[ 1 ] );
			var cuts = data.sides[ side ].cuts;
			var bounds = [ 0, cuts[ 0 ], cuts[ 1 ], 1 ];
			slice( face, urls[ side ], bounds[ index ], bounds[ index + 1 ] );
		} );
	};

	/** Loads both sheets at a size that suits this screen (with room to zoom in). */
	FolderView.prototype.load = function ( width, sharpest ) {
		var self = this;
		var dpr = Math.min( window.devicePixelRatio || 1, 3 );
		var urls = {};
		[ 'binnen', 'buiten' ].forEach( function ( side ) {
			var sources = self.data.sides[ side ].sources;
			urls[ side ] = sharpest ? sources[ sources.length - 1 ].url : pick( sources, width * dpr * 1.5 ).url;
		} );
		var key = urls.binnen + '|' + urls.buiten;
		var sides = this.data.sides;
		var sharpestLoaded =
			this.loaded.binnen === sides.binnen.sources[ sides.binnen.sources.length - 1 ].url &&
			this.loaded.buiten === sides.buiten.sources[ sides.buiten.sources.length - 1 ].url;
		if ( sharpestLoaded || ( urls.binnen === this.loaded.binnen && urls.buiten === this.loaded.buiten ) ) {
			return Promise.resolve();
		}
		if ( key === this.loadingKey ) {
			return this.loading;
		}
		this.loadingKey = key;
		this.loading = Promise.all( [ PS.loadImage( urls.binnen, 4000 ), PS.loadImage( urls.buiten, 4000 ) ] ).then( function () {
			// Never go back to a less sharp version than the one on screen.
			if ( self.loadingKey === key ) {
				self.loaded = urls;
				self.paint( urls );
			}
		} );
		return this.loading;
	};

	FolderView.prototype.show = function () {
		var self = this;
		this.clearTimers();
		this.closing = false;
		this.dialog.el.removeAttribute( 'data-closing' );
		this.leaf.classList.add( 'ps-instant' );
		this.shadow.classList.add( 'ps-instant' );
		this.setOpen( false );
		this.setSide( 'binnen', true );
		this.updateHint();
		this.dialog.open();
		var width = this.measure();
		// Wait for the sheets so the leaflet does not unfold half-empty.
		Promise.race( [ this.load( width ), new Promise( function ( r ) {
			setTimeout( r, 1500 );
		} ) ] ).then( function () {
			if ( ! self.dialog.isOpen() || self.closing ) {
				return;
			}
			requestAnimationFrame( function () {
				self.leaf.classList.remove( 'ps-instant' );
				self.shadow.classList.remove( 'ps-instant' );
				self.later( function () {
					self.setOpen( true );
				}, PS.reducedMotion() ? 0 : 280 );
			} );
		} );
	};

	FolderView.prototype.hide = function () {
		var self = this;
		if ( this.closing || ! this.dialog.isOpen() ) {
			return;
		}
		this.clearTimers();
		this.applyZoom( 1, 0, 0, true );
		this.setOpen( false );
		if ( PS.reducedMotion() ) {
			this.dialog.close();
			this.reset();
			return;
		}
		this.closing = true;
		this.dialog.el.setAttribute( 'data-closing', 'true' );
		this.later( function () {
			self.dialog.close();
			self.reset();
		}, CLOSE_MS );
	};

	FolderView.prototype.reset = function () {
		this.clearTimers();
		this.closing = false;
		this.dialog.el.removeAttribute( 'data-closing' );
		this.setOpen( false );
	};

	FolderView.prototype.setOpen = function ( open ) {
		this.opened = open;
		this.leaf.setAttribute( 'data-open', String( open ) );
		this.shadow.setAttribute( 'data-open', String( open ) );
		Array.prototype.forEach.call( this.sideButtons, function ( b ) {
			b.disabled = ! open;
		} );
		Array.prototype.forEach.call( this.zoomButtons, function ( b ) {
			b.disabled = ! open;
		} );
		this.updateZoomButtons();
	};

	FolderView.prototype.setSide = function ( side, silent ) {
		this.side = side;
		this.leaf.setAttribute( 'data-side', side );
		this.leaf.setAttribute(
			'aria-label',
			side === 'binnen' ? 'Binnenkant van de folder met de menukaart' : 'Buitenkant van de folder'
		);
		Array.prototype.forEach.call( this.sideButtons, function ( b ) {
			b.setAttribute( 'aria-pressed', String( b.getAttribute( 'data-side' ) === side ) );
		} );
		if ( ! silent ) {
			this.applyZoom( 1, 0, 0, true );
		}
	};

	FolderView.prototype.updateHint = function () {
		var portraitPhone = window.matchMedia( '(max-width: 700px) and (orientation: portrait)' ).matches;
		var touch = window.matchMedia( '(hover: none), (pointer: coarse)' ).matches;
		var text = touch ? 'Dubbeltik of knijp om in te zoomen' : 'Dubbelklik of scroll om in te zoomen';
		if ( portraitPhone ) {
			text = 'Draai je telefoon voor een grotere folder · ' + text.charAt( 0 ).toLowerCase() + text.slice( 1 );
		}
		this.hint.textContent = text;
		this.hint.removeAttribute( 'data-used' );
	};

	/* ── Zoom and pan ── */

	/** Keeps the leaflet on screen: centered when it fits, edge to edge when it is larger. */
	FolderView.prototype.clamp = function ( s, x, y ) {
		var rect = this.stage.getBoundingClientRect();
		var bw = this.boxSize.w;
		var bh = this.boxSize.h;
		var bx = ( rect.width - bw ) / 2;
		var by = ( rect.height - bh ) / 2;
		var fit = function ( pos, view, start, size ) {
			if ( size * s <= view ) {
				return ( view - size * s ) / 2 - start * s;
			}
			return Math.min( -start * s, Math.max( view - ( start + size ) * s, pos ) );
		};
		return { s: s, x: fit( x, rect.width, bx, bw ), y: fit( y, rect.height, by, bh ) };
	};

	FolderView.prototype.applyZoom = function ( s, x, y, animate ) {
		var z = this.clamp( Math.min( MAX_ZOOM, Math.max( 1, s ) ), x, y );
		if ( z.s < 1.001 ) {
			z = { s: 1, x: 0, y: 0 };
		}
		this.zoom = z;
		var el = this.dialog.el;
		el.setAttribute( 'data-zoom-anim', animate ? 'true' : 'false' );
		el.setAttribute( 'data-zoomed', String( z.s > 1 ) );
		this.zoomLayer.style.transform = z.s === 1 ? '' : 'translate3d(' + z.x + 'px,' + z.y + 'px,0) scale(' + z.s + ')';
		this.updateZoomButtons();
		if ( z.s > 1.4 && this.boxSize ) {
			this.hint.setAttribute( 'data-used', 'true' );
			// Zoomed in: switch to the sharpest version of the sheets.
			this.load( this.boxSize.w, true );
		}
	};

	/** Zooms to scale s around a point on the screen (relative to the stage). */
	FolderView.prototype.zoomTo = function ( s, px, py, animate ) {
		if ( ! this.opened ) {
			return;
		}
		s = Math.min( MAX_ZOOM, Math.max( 1, s ) );
		var z = this.zoom;
		var x = px - ( px - z.x ) * ( s / z.s );
		var y = py - ( py - z.y ) * ( s / z.s );
		this.applyZoom( s, x, y, animate );
	};

	FolderView.prototype.updateZoomButtons = function () {
		var s = this.zoom.s;
		var open = this.opened;
		if ( ! this.zoomButtons ) {
			return;
		}
		this.zoomButtons[ 0 ].disabled = ! open || s <= 1;
		this.zoomButtons[ 1 ].disabled = ! open || s >= MAX_ZOOM - 0.01;
	};

	FolderView.prototype.bindGestures = function () {
		var self = this;
		var stage = this.stage;
		var pointers = {};
		var count = 0;
		var gesture = null;
		var lastTap = null;

		function point( e ) {
			var rect = stage.getBoundingClientRect();
			return { x: e.clientX - rect.left, y: e.clientY - rect.top };
		}
		function list() {
			return Object.keys( pointers ).map( function ( k ) {
				return pointers[ k ];
			} );
		}
		function begin() {
			var ps = list();
			var z = self.zoom;
			if ( ps.length >= 2 ) {
				var a = ps[ 0 ];
				var b = ps[ 1 ];
				gesture = {
					type: 'pinch',
					dist: Math.hypot( a.x - b.x, a.y - b.y ) || 1,
					mid: { x: ( a.x + b.x ) / 2, y: ( a.y + b.y ) / 2 },
					z: { s: z.s, x: z.x, y: z.y },
					moved: true,
				};
			} else if ( ps.length === 1 ) {
				gesture = { type: 'pan', start: ps[ 0 ], z: { s: z.s, x: z.x, y: z.y }, moved: false, target: gesture && gesture.target };
			}
		}

		stage.addEventListener( 'pointerdown', function ( e ) {
			if ( e.pointerType === 'mouse' && e.button !== 0 ) {
				return;
			}
			try {
				stage.setPointerCapture( e.pointerId );
			} catch ( err ) {}
			pointers[ e.pointerId ] = point( e );
			count++;
			var target = e.target;
			begin();
			if ( gesture ) {
				gesture.target = target;
			}
		} );

		stage.addEventListener( 'pointermove', function ( e ) {
			if ( ! pointers[ e.pointerId ] || ! gesture ) {
				return;
			}
			pointers[ e.pointerId ] = point( e );
			var ps = list();
			if ( gesture.type === 'pinch' && ps.length >= 2 && self.opened ) {
				var a = ps[ 0 ];
				var b = ps[ 1 ];
				var dist = Math.hypot( a.x - b.x, a.y - b.y );
				var mid = { x: ( a.x + b.x ) / 2, y: ( a.y + b.y ) / 2 };
				var s = Math.min( MAX_ZOOM, Math.max( 1, gesture.z.s * ( dist / gesture.dist ) ) );
				// Zoom around the starting midpoint and follow the fingers as they move.
				var x = gesture.mid.x - ( gesture.mid.x - gesture.z.x ) * ( s / gesture.z.s ) + ( mid.x - gesture.mid.x );
				var y = gesture.mid.y - ( gesture.mid.y - gesture.z.y ) * ( s / gesture.z.s ) + ( mid.y - gesture.mid.y );
				self.applyZoom( s, x, y, false );
			} else if ( gesture.type === 'pan' ) {
				var p = ps[ 0 ];
				var dx = p.x - gesture.start.x;
				var dy = p.y - gesture.start.y;
				if ( ! gesture.moved && Math.hypot( dx, dy ) > 8 ) {
					gesture.moved = true;
				}
				if ( gesture.moved && self.zoom.s > 1 ) {
					self.dialog.el.setAttribute( 'data-panning', 'true' );
					self.applyZoom( gesture.z.s, gesture.z.x + dx, gesture.z.y + dy, false );
				}
			}
		} );

		function end( e ) {
			if ( ! pointers[ e.pointerId ] ) {
				return;
			}
			var p = pointers[ e.pointerId ];
			delete pointers[ e.pointerId ];
			count--;
			self.dialog.el.removeAttribute( 'data-panning' );
			var was = gesture;
			if ( count > 0 ) {
				begin();
				if ( gesture ) {
					gesture.moved = true; // after a pinch, lifting one finger is not a tap
				}
				return;
			}
			gesture = null;
			if ( ! was || was.moved || was.type !== 'pan' || e.type === 'pointercancel' ) {
				lastTap = null;
				return;
			}
			// A tap.
			var onLeaf = self.box.contains( was.target );
			if ( ! self.opened ) {
				lastTap = null;
				if ( onLeaf && ! self.closing ) {
					self.clearTimers();
					self.setOpen( true );
				} else if ( ! onLeaf ) {
					self.hide();
				}
				return;
			}
			var now = Date.now();
			if ( lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot( p.x - lastTap.x, p.y - lastTap.y ) < 30 ) {
				lastTap = null;
				if ( self.zoom.s > 1.05 ) {
					self.applyZoom( 1, 0, 0, true );
				} else {
					self.zoomTo( 2.5, p.x, p.y, true );
				}
				return;
			}
			lastTap = { t: now, x: p.x, y: p.y };
			if ( ! onLeaf && self.zoom.s === 1 ) {
				// Tap next to the leaflet closes it (after a moment, in case it was the start of a double tap).
				var tap = lastTap;
				self.later( function () {
					if ( lastTap === tap ) {
						self.hide();
					}
				}, DOUBLE_TAP_MS );
			}
		}
		stage.addEventListener( 'pointerup', end );
		stage.addEventListener( 'pointercancel', end );

		stage.addEventListener(
			'wheel',
			function ( e ) {
				if ( ! self.opened ) {
					return;
				}
				e.preventDefault();
				var p = point( e );
				var delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
				// A pinch on a trackpad arrives as a wheel event with ctrlKey; scrolling pans when zoomed in.
				if ( ! e.ctrlKey && self.zoom.s > 1 && Math.abs( e.deltaX ) > Math.abs( e.deltaY ) ) {
					self.applyZoom( self.zoom.s, self.zoom.x - e.deltaX, self.zoom.y, false );
					return;
				}
				self.zoomTo( self.zoom.s * Math.exp( -delta * ( e.ctrlKey ? 0.01 : 0.0025 ) ), p.x, p.y, false );
			},
			{ passive: false }
		);
	};

	FolderView.prototype.onKey = function ( e ) {
		if ( ! this.opened || e.altKey || e.metaKey || e.ctrlKey ) {
			return;
		}
		var rect = this.stage.getBoundingClientRect();
		var z = this.zoom;
		var step = 60;
		switch ( e.key ) {
			case '+':
			case '=':
				this.zoomTo( z.s * 1.6, rect.width / 2, rect.height / 2, true );
				break;
			case '-':
			case '_':
				this.zoomTo( z.s / 1.6, rect.width / 2, rect.height / 2, true );
				break;
			case '0':
				this.applyZoom( 1, 0, 0, true );
				break;
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown':
				if ( z.s <= 1 || ( e.target && e.target.closest && e.target.closest( '.ps-seg' ) ) ) {
					return;
				}
				this.applyZoom(
					z.s,
					z.x + ( e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0 ),
					z.y + ( e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0 ),
					true
				);
				break;
			default:
				return;
		}
		e.preventDefault();
	};

	/* ── The folded leaflet on the page ── */

	var preview = null;
	window.PSarahFolder = {
		/** Opens a folder from settings (used for the preview in the WordPress admin). */
		open: function ( data ) {
			if ( preview ) {
				preview.dialog.el.remove();
			}
			preview = new FolderView( data );
			preview.show();
			return preview;
		},
	};

	var observer =
		'IntersectionObserver' in window
			? new IntersectionObserver( function ( entries ) {
					entries.forEach( function ( entry ) {
						if ( entry.isIntersecting ) {
							entry.target.removeAttribute( 'data-offscreen' );
						} else {
							entry.target.setAttribute( 'data-offscreen', '' );
						}
					} );
			  } )
			: null;

	PS.each( '[data-ps-folder]', function ( root ) {
		var data;
		try {
			data = JSON.parse( root.getAttribute( 'data-ps-folder' ) );
		} catch ( e ) {
			return;
		}
		var trigger = root.querySelector( '.ps-folder__trigger' );
		if ( ! trigger || ! data || ! data.sides ) {
			return;
		}
		if ( observer ) {
			observer.observe( root );
		}
		var view = null;
		var prepare = function () {
			if ( ! view ) {
				view = new FolderView( data );
			}
			return view;
		};
		trigger.addEventListener( 'click', function ( e ) {
			if ( e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ) {
				return;
			}
			e.preventDefault();
			prepare().show();
		} );
		// Start loading the sheets as soon as someone shows interest.
		var warm = function () {
			var v = prepare();
			v.load( Math.min( window.innerWidth, 1800 ) );
		};
		trigger.addEventListener( 'pointerenter', warm, { once: true } );
		trigger.addEventListener( 'touchstart', warm, { once: true, passive: true } );
		trigger.addEventListener( 'focus', warm, { once: true } );
	} );
} )();
