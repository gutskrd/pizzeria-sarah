/**
 * Pizzeria Sarah – the 360° photo.
 *
 * A tap on the photo opens a full-screen view. Only then the 360° viewer
 * (Pannellum, 56 kB) and the photo itself are loaded, in a size that suits the
 * device: a lighter version for phones, the sharpest one for tablets and
 * computers. Look around by dragging, zoom by pinching or scrolling, or, on a
 * phone, by moving the phone itself.
 */
( function () {
	'use strict';
	var PS = window.PSarah;
	if ( ! PS ) {
		return;
	}

	var viewerScript = null;

	function loadViewer( data ) {
		if ( window.pannellum ) {
			return Promise.resolve();
		}
		if ( ! viewerScript ) {
			viewerScript = new Promise( function ( resolve, reject ) {
				if ( ! document.querySelector( 'link[data-psarah-pannellum]' ) ) {
					var link = document.createElement( 'link' );
					link.rel = 'stylesheet';
					link.href = data.viewerCss;
					link.setAttribute( 'data-psarah-pannellum', '' );
					document.head.appendChild( link );
				}
				var script = document.createElement( 'script' );
				script.src = data.viewerJs;
				script.async = true;
				script.onload = function () {
					resolve();
				};
				script.onerror = function () {
					viewerScript = null;
					reject( new Error( 'viewer' ) );
				};
				document.head.appendChild( script );
			} );
		}
		return viewerScript;
	}

	var textureLimit = null;
	/** The widest photo this device can show (0 without WebGL). Pannellum splits wide photos over two textures. */
	function maxPhotoWidth() {
		if ( textureLimit !== null ) {
			return textureLimit;
		}
		textureLimit = 0;
		try {
			var canvas = document.createElement( 'canvas' );
			var gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
			if ( gl ) {
				textureLimit = gl.getParameter( gl.MAX_TEXTURE_SIZE ) * 2;
				var lose = gl.getExtension( 'WEBGL_lose_context' );
				if ( lose ) {
					lose.loseContext();
				}
			}
		} catch ( e ) {
			textureLimit = 0;
		}
		return textureLimit;
	}

	/** Phones get at most 4096 pixels (lighter and safe for their memory); larger screens the sharpest that fits. */
	function chooseSources( sources ) {
		var limit = maxPhotoWidth();
		var smallScreen = Math.min( window.screen.width, window.screen.height ) < 600;
		var saveData = navigator.connection && navigator.connection.saveData;
		var cap = smallScreen || saveData ? 4096 : 8192;
		var usable = sources.filter( function ( s ) {
			return s.w <= limit;
		} );
		var preferred = usable.filter( function ( s ) {
			return s.w <= cap;
		} );
		var first = preferred.length ? preferred[ preferred.length - 1 ] : usable[ 0 ];
		if ( ! first ) {
			return [];
		}
		// Fall back to smaller versions if the first one fails.
		return [ first ].concat(
			usable
				.filter( function ( s ) {
					return s.w < first.w;
				} )
				.reverse()
		);
	}

	var RAD = Math.PI / 180;
	/** Horizontal field of view that gives a vertical field of view of vfov on a screen with this shape. */
	function hfovFor( vfov, aspect ) {
		return ( 2 * Math.atan( Math.tan( ( vfov * RAD ) / 2 ) * aspect ) ) / RAD;
	}
	function vfovFor( hfov, aspect ) {
		return ( 2 * Math.atan( Math.tan( ( hfov * RAD ) / 2 ) / aspect ) ) / RAD;
	}

	var icons = {
		phone:
			'<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="2.5" width="10" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 8.5c-1.3 2.2-1.3 4.8 0 7M20.5 8.5c1.3 2.2 1.3 4.8 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
		expand:
			'<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		hand:
			'<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V12m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L4.6 16a1.6 1.6 0 0 1 2.4-2.1L8 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	};

	function fullscreenElement() {
		return document.fullscreenElement || document.webkitFullscreenElement || null;
	}
	function canFullscreen() {
		return Boolean( document.fullscreenEnabled || document.webkitFullscreenEnabled );
	}

	function PanoView( data ) {
		this.data = data;
		this.viewer = null;
		this.build();
	}

	PanoView.prototype.build = function () {
		var self = this;
		var esc = PS.escapeHtml;
		var touch = window.matchMedia( '(hover: none), (pointer: coarse)' ).matches;
		this.dialog = PS.createDialog( {
			className: 'ps-pano-dialog',
			label: '360°-foto: ' + this.data.title,
			onRequestClose: function () {
				self.hide();
			},
			onClosed: function () {
				self.teardown();
			},
		} );
		var el = this.dialog.el;
		el.innerHTML =
			'<div class="ps-pano-dialog__viewer" tabindex="0" role="application" aria-roledescription="360°-foto" aria-label="360°-foto. Kijk rond met de pijltjestoetsen, zoom met plus en min."></div>' +
			'<div class="ps-dialog__bar"><p class="ps-dialog__title">' + esc( this.data.title ) + '</p>' +
			'<button type="button" class="ps-btn ps-btn--icon" data-act="close" aria-label="360°-foto sluiten">' + PS.icons.close + '</button></div>' +
			'<div class="ps-pano-dialog__tools">' +
			'<button type="button" class="ps-btn ps-btn--icon" data-act="gyro" aria-pressed="false" aria-label="Rondkijken door je telefoon te bewegen" hidden>' + icons.phone + '</button>' +
			'<button type="button" class="ps-btn ps-btn--icon" data-act="in" aria-label="Inzoomen">' + PS.icons.plus + '</button>' +
			'<button type="button" class="ps-btn ps-btn--icon" data-act="out" aria-label="Uitzoomen">' + PS.icons.minus + '</button>' +
			'<button type="button" class="ps-btn ps-btn--icon" data-act="fullscreen" aria-pressed="false" aria-label="Volledig scherm" hidden>' + icons.expand + '</button>' +
			'</div>' +
			'<div class="ps-pano-dialog__hint" aria-hidden="true">' + icons.hand + '<span>' +
			( touch ? 'Sleep met je vinger om rond te kijken' : 'Sleep om rond te kijken · scroll om te zoomen' ) +
			'</span></div>' +
			'<div class="ps-pano-dialog__status" data-state="loading" role="status"><div class="ps-spinner" aria-hidden="true"></div><p>De 360°-foto wordt geladen…</p></div>';

		this.viewerEl = el.querySelector( '.ps-pano-dialog__viewer' );
		this.status = el.querySelector( '.ps-pano-dialog__status' );
		this.hint = el.querySelector( '.ps-pano-dialog__hint' );
		this.buttons = {};
		Array.prototype.forEach.call( el.querySelectorAll( '[data-act]' ), function ( b ) {
			self.buttons[ b.getAttribute( 'data-act' ) ] = b;
		} );
		this.status.style.backgroundImage = 'url("' + this.data.poster.replace( /"/g, '%22' ) + '")';

		this.buttons.close.addEventListener( 'click', function () {
			self.hide();
		} );
		this.buttons[ 'in' ].addEventListener( 'click', function () {
			self.zoomBy( 1 / 1.35 );
		} );
		this.buttons.out.addEventListener( 'click', function () {
			self.zoomBy( 1.35 );
		} );
		this.buttons.gyro.addEventListener( 'click', function () {
			self.toggleGyro();
		} );
		this.buttons.fullscreen.addEventListener( 'click', function () {
			self.toggleFullscreen();
		} );
		var onFullscreen = function () {
			self.buttons.fullscreen.setAttribute( 'aria-pressed', String( fullscreenElement() === el ) );
		};
		document.addEventListener( 'fullscreenchange', onFullscreen );
		document.addEventListener( 'webkitfullscreenchange', onFullscreen );

		var onResize = function () {
			if ( self.viewer && self.dialog.isOpen() ) {
				self.fitFieldOfView( true );
			}
		};
		window.addEventListener( 'resize', onResize );
	};

	PanoView.prototype.aspect = function () {
		var r = this.viewerEl.getBoundingClientRect();
		return r.height > 0 ? r.width / r.height : 16 / 9;
	};

	/**
	 * The start view is chosen on a computer. On a phone held upright the same
	 * horizontal angle would look stretched, so the view keeps a natural height instead.
	 */
	PanoView.prototype.fieldOfView = function () {
		var aspect = this.aspect();
		var vSaved = vfovFor( this.data.hfov, 16 / 9 );
		var vfov = Math.min( 100, Math.max( aspect < 1 ? 95 : 60, vSaved ) );
		return {
			start: Math.min( 120, hfovFor( vfov, aspect ) ),
			min: Math.max( 8, hfovFor( 25, aspect ) ),
			max: Math.min( 120, hfovFor( 110, aspect ) ),
		};
	};

	PanoView.prototype.fitFieldOfView = function ( keepView ) {
		var aspect = this.aspect();
		var fov = this.fieldOfView();
		if ( ! this.viewer ) {
			return;
		}
		var current = this.viewer.getHfov();
		this.viewer.setHfovBounds( [ fov.min, fov.max ] );
		if ( keepView && this.lastAspect ) {
			// Keep the same height of view after turning the device.
			var v = vfovFor( current, this.lastAspect );
			this.viewer.setHfov( Math.min( fov.max, Math.max( fov.min, hfovFor( v, aspect ) ) ), false );
		}
		this.lastAspect = aspect;
	};

	PanoView.prototype.show = function () {
		var self = this;
		this.setStatus( 'loading', 'De 360°-foto wordt geladen…' );
		this.hint.removeAttribute( 'data-used' );
		this.buttons.fullscreen.hidden = ! canFullscreen();
		this.dialog.open();
		var sources = chooseSources( this.data.sources );
		if ( ! sources.length ) {
			this.fail( 'Je browser kan deze 360°-foto niet tonen. Probeer een andere browser, zoals Chrome, Safari of Firefox.' );
			return;
		}
		loadViewer( this.data ).then(
			function () {
				if ( self.dialog.isOpen() ) {
					self.start( sources );
				}
			},
			function () {
				self.fail( 'De 360°-foto kon niet worden geladen. Controleer je internetverbinding en probeer het opnieuw.' );
			}
		);
	};

	PanoView.prototype.start = function ( sources ) {
		var self = this;
		var data = this.data;
		var source = sources[ 0 ];
		var fov = this.fieldOfView();
		var config = {
			type: 'equirectangular',
			panorama: source.url,
			autoLoad: true,
			showControls: false,
			showZoomCtrl: false,
			showFullscreenCtrl: false,
			compass: false,
			keyboardZoom: true,
			mouseZoom: true,
			draggable: true,
			friction: 0.15,
			yaw: data.yaw,
			pitch: data.pitch,
			hfov: fov.start,
			minHfov: fov.min,
			maxHfov: fov.max,
			ignoreGPanoXMP: true,
			crossOrigin: 'anonymous',
			// The viewer's default list includes Escape (27); leave that to the dialog so it closes.
			capturedKeyNumbers: [ 16, 17, 37, 38, 39, 40, 61, 65, 68, 83, 87, 107, 109, 173, 187, 189 ],
			strings: {
				loadingLabel: 'Laden…',
				loadButtonLabel: 'Laden',
				genericWebGLError: 'Je browser kan deze 360°-foto niet tonen.',
				textureSizeError: 'Deze 360°-foto is te groot voor dit apparaat.',
				unknownError: 'Er ging iets mis.',
			},
		};
		if ( data.coverage ) {
			config.haov = data.coverage.haov;
			config.vaov = data.coverage.vaov;
			config.vOffset = data.coverage.vOffset;
			config.avoidShowingBackground = true;
		}
		if ( data.autorotate && ! PS.reducedMotion() ) {
			config.autoRotate = -1.5;
			config.autoRotateInactivityDelay = 6000;
		}

		this.teardown();
		var viewer = window.pannellum.viewer( this.viewerEl, config );
		this.viewer = viewer;
		this.lastAspect = this.aspect();

		viewer.on( 'load', function () {
			if ( self.viewer !== viewer ) {
				return;
			}
			self.setStatus( null );
			self.buttons.gyro.hidden = ! viewer.isOrientationSupported();
			self.viewerEl.focus( { preventScroll: true } );
			self.hintTimer = setTimeout( function () {
				self.hint.setAttribute( 'data-used', 'true' );
			}, 7000 );
		} );
		viewer.on( 'error', function () {
			if ( self.viewer !== viewer ) {
				return;
			}
			if ( sources.length > 1 ) {
				// Try a lighter version.
				self.start( sources.slice( 1 ) );
			} else {
				self.fail( 'Deze 360°-foto kan op dit apparaat niet worden getoond.' );
			}
		} );
		var interacted = function () {
			self.hint.setAttribute( 'data-used', 'true' );
			setTimeout( function () {
				if ( self.viewer === viewer ) {
					self.buttons.gyro.setAttribute( 'aria-pressed', String( viewer.isOrientationActive() ) );
				}
			}, 50 );
		};
		viewer.on( 'mousedown', interacted );
		viewer.on( 'touchstart', interacted );
		viewer.on( 'zoomchange', function () {
			self.hint.setAttribute( 'data-used', 'true' );
		} );
	};

	PanoView.prototype.zoomBy = function ( factor ) {
		if ( ! this.viewer ) {
			return;
		}
		this.hint.setAttribute( 'data-used', 'true' );
		this.viewer.setHfov( this.viewer.getHfov() * factor, 300 );
	};

	PanoView.prototype.toggleGyro = function () {
		var viewer = this.viewer;
		var button = this.buttons.gyro;
		if ( ! viewer ) {
			return;
		}
		if ( viewer.isOrientationActive() ) {
			viewer.stopOrientation();
		} else {
			viewer.stopAutoRotate();
			viewer.startOrientation();
		}
		// On an iPhone the visitor first has to allow motion access.
		var check = function ( tries ) {
			button.setAttribute( 'aria-pressed', String( viewer.isOrientationActive() ) );
			if ( tries > 0 ) {
				setTimeout( function () {
					check( tries - 1 );
				}, 300 );
			}
		};
		check( 10 );
	};

	PanoView.prototype.toggleFullscreen = function () {
		var el = this.dialog.el;
		if ( fullscreenElement() ) {
			( document.exitFullscreen || document.webkitExitFullscreen ).call( document );
		} else {
			var request = el.requestFullscreen || el.webkitRequestFullscreen;
			if ( request ) {
				var result = request.call( el );
				if ( result && result.catch ) {
					result.catch( function () {} );
				}
			}
		}
	};

	PanoView.prototype.setStatus = function ( state, message ) {
		if ( ! state ) {
			this.status.hidden = true;
			return;
		}
		this.status.hidden = false;
		this.status.setAttribute( 'data-state', state );
		this.status.querySelector( 'p' ).textContent = message;
	};

	PanoView.prototype.fail = function ( message ) {
		this.teardown();
		this.setStatus( 'error', message );
		this.hint.setAttribute( 'data-used', 'true' );
	};

	PanoView.prototype.teardown = function () {
		clearTimeout( this.hintTimer );
		if ( this.viewer ) {
			try {
				this.viewer.destroy();
			} catch ( e ) {}
			this.viewer = null;
		}
	};

	PanoView.prototype.hide = function () {
		var self = this;
		if ( ! this.dialog.isOpen() ) {
			return;
		}
		var finish = function () {
			self.dialog.close();
			// Free the memory of the photo; it opens quickly again from the browser cache.
			self.teardown();
			self.buttons.gyro.setAttribute( 'aria-pressed', 'false' );
		};
		if ( fullscreenElement() === this.dialog.el ) {
			var exit = ( document.exitFullscreen || document.webkitExitFullscreen ).call( document );
			if ( exit && exit.then ) {
				exit.then( finish, finish );
				return;
			}
		}
		finish();
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

	PS.each( '[data-ps-pano]', function ( root ) {
		var data;
		try {
			data = JSON.parse( root.getAttribute( 'data-ps-pano' ) );
		} catch ( e ) {
			return;
		}
		var poster = root.querySelector( '.ps-pano__poster' );
		if ( ! poster || ! data || ! data.sources || ! data.sources.length ) {
			return;
		}
		if ( observer ) {
			observer.observe( root );
		}
		var view = null;
		poster.addEventListener( 'click', function ( e ) {
			if ( e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ) {
				return;
			}
			e.preventDefault();
			if ( ! view ) {
				view = new PanoView( data );
			}
			view.show();
		} );
		// Fetch the viewer as soon as someone shows interest, so it opens without waiting.
		var warm = function () {
			loadViewer( data ).catch( function () {} );
		};
		poster.addEventListener( 'pointerenter', warm, { once: true } );
		poster.addEventListener( 'touchstart', warm, { once: true, passive: true } );
		poster.addEventListener( 'focus', warm, { once: true } );
	} );
} )();
