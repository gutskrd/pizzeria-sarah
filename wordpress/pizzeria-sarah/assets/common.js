/**
 * Pizzeria Sarah – shared helpers for the full-screen views.
 *
 * A full-screen view is a native <dialog>: it sits above the whole theme,
 * keeps keyboard focus inside, and closes with the close button, Escape or
 * the back button of a phone (which then does not leave the page).
 */
( function () {
	'use strict';
	if ( window.PSarah ) {
		return;
	}

	var html = document.documentElement;
	var locks = 0;
	var saved = null;

	function lockScroll() {
		if ( locks++ > 0 ) {
			return;
		}
		saved = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
		// Keep the space of the scrollbar so the page does not jump sideways.
		if ( window.innerWidth > html.clientWidth ) {
			html.style.scrollbarGutter = 'stable';
		}
		html.style.overflow = 'hidden';
	}

	function unlockScroll() {
		if ( locks === 0 || --locks > 0 || ! saved ) {
			return;
		}
		html.style.overflow = saved.overflow;
		html.style.scrollbarGutter = saved.gutter;
		saved = null;
	}

	/**
	 * @param {{className: string, label: string, onRequestClose: function(): void}} opts
	 *   onRequestClose runs on Escape, the back button and a click outside; it
	 *   should play the closing animation and then call close().
	 */
	function createDialog( opts ) {
		var dialog = document.createElement( 'dialog' );
		dialog.className = 'ps-dialog ' + opts.className;
		dialog.setAttribute( 'aria-label', opts.label );
		document.body.appendChild( dialog );

		var isOpen = false;
		var pushed = false;

		function onPopState() {
			if ( isOpen ) {
				pushed = false;
				opts.onRequestClose();
			}
		}

		// after: runs once the extra history step is gone again (for a link that leaves the view).
		function cleanUp( after ) {
			isOpen = false;
			window.removeEventListener( 'popstate', onPopState );
			unlockScroll();
			if ( pushed ) {
				pushed = false;
				if ( after ) {
					window.addEventListener( 'popstate', function once() {
						window.removeEventListener( 'popstate', once );
						after();
					} );
				}
				history.back();
			} else if ( after ) {
				after();
			}
		}

		dialog.addEventListener( 'cancel', function ( e ) {
			e.preventDefault();
			opts.onRequestClose();
		} );
		// The browser can also close a dialog on its own (for example after Escape is pressed twice).
		dialog.addEventListener( 'close', function () {
			if ( isOpen ) {
				cleanUp();
				if ( opts.onClosed ) {
					opts.onClosed();
				}
			}
		} );

		return {
			el: dialog,
			isOpen: function () {
				return isOpen;
			},
			open: function () {
				if ( isOpen ) {
					return;
				}
				isOpen = true;
				lockScroll();
				dialog.showModal();
				try {
					history.pushState( { psarahDialog: true }, '' );
					pushed = true;
				} catch ( e ) {
					pushed = false;
				}
				window.addEventListener( 'popstate', onPopState );
			},
			close: function ( after ) {
				if ( ! isOpen ) {
					return;
				}
				cleanUp( after );
				dialog.close();
			},
		};
	}

	function reducedMotion() {
		return window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	}

	function escapeHtml( text ) {
		return String( text ).replace( /[&<>"']/g, function ( c ) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ c ];
		} );
	}

	/** Loads an image and waits until it can be shown without stutter (or until the time is up). */
	function loadImage( url, maxWait ) {
		return new Promise( function ( resolve ) {
			var img = new Image();
			var done = false;
			var finish = function () {
				if ( ! done ) {
					done = true;
					resolve( img );
				}
			};
			img.decoding = 'async';
			img.onload = function () {
				if ( img.decode ) {
					img.decode().then( finish, finish );
				} else {
					finish();
				}
			};
			img.onerror = finish;
			img.src = url;
			if ( maxWait ) {
				setTimeout( finish, maxWait );
			}
		} );
	}

	/** Runs fn once for every element that matches, also for elements added later (for example by a page builder). */
	function each( selector, fn ) {
		var run = function () {
			var nodes = document.querySelectorAll( selector );
			for ( var i = 0; i < nodes.length; i++ ) {
				if ( ! nodes[ i ].psarahReady ) {
					nodes[ i ].psarahReady = true;
					fn( nodes[ i ] );
				}
			}
		};
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', run );
		} else {
			run();
		}
		if ( window.MutationObserver ) {
			var queued = false;
			new MutationObserver( function () {
				if ( ! queued ) {
					queued = true;
					requestAnimationFrame( function () {
						queued = false;
						run();
					} );
				}
			} ).observe( document.documentElement, { childList: true, subtree: true } );
		}
	}

	var icons = {
		close: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
		plus: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
		minus: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
	};

	window.PSarah = {
		createDialog: createDialog,
		reducedMotion: reducedMotion,
		escapeHtml: escapeHtml,
		loadImage: loadImage,
		each: each,
		icons: icons,
	};
} )();
