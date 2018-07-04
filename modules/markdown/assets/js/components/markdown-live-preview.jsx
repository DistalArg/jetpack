/* global React:true */

/**
 * External dependencies
 */
import endsWith from 'lodash/endsWith';

/**
 * Internal dependencies
 */
import CaretManager from '../utils/caret-management';
import markdownConverter from '../utils/markdown-converter';

const renderHTML = function( source ) {
	if ( source ) {
		return markdownConverter.renderPreview( source )
		// The MarkdownIt renderer adds new lines after each paragraph/heading
		// tag. This affects the restoration of the caret position, so we need
		// to remove them
			.split( /\n/ ).join( '' )
			.trim();
	}
};

const stripTrailingNewLines = function( text ) {
	if ( text ) {
		return text.replace( /\n{1,2}$/, '' );
	}
};

const triggerOnChange = function( evt, source ) {
	if ( this.props.onChange ) {
		// Clone event with Object.assign to avoid
		// "Cannot assign to read only property 'target' of object"
		evt = Object.assign( {}, evt, {
			target: {
				value: source
			}
		} );
		this.props.onChange( evt );
	}
};

const sourceIsEmpty = function( source ) {
	return ! source;
};

const ignoreLastInput = function( source ) {
	const SPACE = String.fromCharCode( 32 );
	const NO_BREAK_SPACE = String.fromCharCode( 160 );

	return endsWith( source, SPACE ) || endsWith( source, NO_BREAK_SPACE );
};

const emptyState = '<p></p>';

const addDomNodeReference = function( node ) {
	this.htmlEl = node;
};

const renderMarkdownPreview = function( evt ) {
	if ( ! this.htmlEl ) {
		return true;
	}

	// We need to delete the last two new lines added by the browser for the
	// last node in the component's content. This behaviour interferes with
	// headings parsing.
	const source = stripTrailingNewLines( this.htmlEl.innerText );

	triggerOnChange.call( this, evt, source );

	// if there's no source, we don't need to parse anything
	if ( sourceIsEmpty( source ) ) {
		this.htmlEl.innerHTML = emptyState;
		return true;
	}

	// commonmark doesn't allow trailing spaces in paragraphs, so if we've
	// added a space, calling markdownIt now will remove it
	if ( ignoreLastInput( source ) ) {
		return true;
	}

	if ( source ) {
		const html = renderHTML( source );

		this.setState( {
			html
		} );
	}

	return true;
};

const OBSERVER_CONFIG = { subtree: true, characterData: true };

const isIE11 = !! window.MSInputMethodContext && !! document.documentMode;

export default class MarkdownLivePreview extends React.Component {

	constructor( props ) {
		super();

		const { source } = props;

		this.caretManager = new CaretManager();
		this.domNodeReference = addDomNodeReference.bind( this );
		this.renderMarkdownPreview = renderMarkdownPreview.bind( this );

		this.state = {
			html: source ? renderHTML( source ) : emptyState,
		};
	}

	shouldComponentUpdate( nextProps, nextState ) {
		if ( this.state.html !== nextState.html ) {
			return true;
		}
	}

	getSnapshotBeforeUpdate( prevProps, prevState ) {
		if ( this.state.html !== prevState.html ) {
			this.caretManager.savePosition( this.htmlEl );
		}
	}

	componentDidUpdate() {
		// once the component has be rendered, we can restore the caret position
		this.caretManager.restorePosition( this.htmlEl );
	}

	componentDidMount() {
		if ( this.props.isSelected && this.htmlEl ) {
			this.htmlEl.focus();
		}
		// onInput doesn't work for content editable elements in Internet Explorer 11,
		// but we can use a MutationObserver instead
		if ( isIE11 ) {
			this.observer = new MutationObserver( ( mutations ) => {
				mutations.forEach( renderMarkdownPreview.bind( this ) );
			} );
			this.observer.observe( this.htmlEl, OBSERVER_CONFIG );
		}
	}

	render() {
		return (
			/* eslint-disable react/no-danger */
			<div
				{ ...this.props }
				ref={ this.domNodeReference }
				onInput={ this.renderMarkdownPreview }
				contentEditable={ ! this.props.disabled }
				dangerouslySetInnerHTML={ { __html: this.state.html } }
			></div>
			/* eslint-enable react/no-danger */
		);
	}

}
