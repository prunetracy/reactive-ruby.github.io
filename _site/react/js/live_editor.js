'use strict';

var IS_MOBILE = navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i);

var CodeMirrorEditor = React.createClass({
  displayName: 'CodeMirrorEditor',

  propTypes: {
    lineNumbers: React.PropTypes.bool,
    onChange: React.PropTypes.func
  },
  getDefaultProps: function getDefaultProps() {
    return {
      lineNumbers: false
    };
  },
  componentDidMount: function componentDidMount() {
    if (IS_MOBILE) return;

    this.editor = CodeMirror.fromTextArea(React.findDOMNode(this.refs.editor), {
      mode: 'ruby',
      lineNumbers: this.props.lineNumbers,
      lineWrapping: true,
      smartIndent: true, // javascript mode does bad things with jsx indents
      matchBrackets: true,
      theme: 'rubyblue',
      readOnly: this.props.readOnly
    });
    this.editor.on('change', this.handleChange);
  },

  componentDidUpdate: function componentDidUpdate() {
    if (this.props.readOnly) {
      this.editor.setValue(this.props.codeText);
    }
  },

  handleChange: function handleChange() {
    if (!this.props.readOnly) {
      this.props.onChange && this.props.onChange(this.editor.getValue());
    }
  },

  render: function render() {
    // wrap in a div to fully contain CodeMirror
    var editor;

    if (IS_MOBILE) {
      editor = React.createElement(
        'pre',
        { style: { overflow: 'scroll' } },
        this.props.codeText
      );
    } else {
      editor = React.createElement('textarea', { ref: 'editor', defaultValue: this.props.codeText });
    }

    return React.createElement(
      'div',
      { style: this.props.style, className: this.props.className },
      editor
    );
  }
});

var selfCleaningTimeout = {
  componentDidUpdate: function componentDidUpdate() {
    clearTimeout(this.timeoutID);
  },

  setTimeout: (function (_setTimeout) {
    function setTimeout() {
      return _setTimeout.apply(this, arguments);
    }

    setTimeout.toString = function () {
      return _setTimeout.toString();
    };

    return setTimeout;
  })(function () {
    clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout.apply(null, arguments);
  })
};

var ReactPlayground = React.createClass({
  displayName: 'ReactPlayground',

  mixins: [selfCleaningTimeout],

  MODES: { JSX: 'JSX', JS: 'JS' }, //keyMirror({JSX: true, JS: true}),

  propTypes: {
    codeText: React.PropTypes.string.isRequired,
    elementId: React.PropTypes.string.isRequired,
    transformer: React.PropTypes.func,
    renderCode: React.PropTypes.bool,
    showCompiledJSTab: React.PropTypes.bool,
    showLineNumbers: React.PropTypes.bool,
    editorTabTitle: React.PropTypes.string
  },

  getDefaultProps: function getDefaultProps() {
    return {
      transformer: function transformer(code) {
        var compiled_code = Opal.Opal.Compiler.$new(code).$compile();
        //result = `eval(#{compiled_code})`
        //puts "result = #{result}"
        return compiled_code;
        //return babel.transform(code).code;
      },
      editorTabTitle: 'Live Ruby Editor',
      showCompiledJSTab: true,
      showLineNumbers: false
    };
  },

  getInitialState: function getInitialState() {
    return {
      mode: this.MODES.JSX,
      code: this.props.codeText
    };
  },

  handleCodeChange: function handleCodeChange(value) {
    this.setState({ code: value });
    this.executeCode();
  },

  handleCodeModeSwitch: function handleCodeModeSwitch(mode) {
    this.setState({ mode: mode });
  },

  compileCode: function compileCode() {
    return this.props.transformer(this.state.code);
  },

  render: function render() {
    var isJS = this.state.mode === this.MODES.JS;
    var compiledCode = '';
    try {
      compiledCode = this.compileCode();
    } catch (err) {}

    var JSContent = React.createElement(CodeMirrorEditor, {
      key: 'js',
      className: 'playgroundStage CodeMirror-readonly',
      onChange: this.handleCodeChange,
      codeText: compiledCode,
      readOnly: true,
      lineNumbers: this.props.showLineNumbers
    });

    var JSXContent = React.createElement(CodeMirrorEditor, {
      key: 'jsx',
      onChange: this.handleCodeChange,
      className: 'playgroundStage',
      codeText: this.state.code,
      lineNumbers: this.props.showLineNumbers
    });

    var JSXTabClassName = 'playground-tab' + (isJS ? '' : ' playground-tab-active');
    var JSTabClassName = 'playground-tab' + (isJS ? ' playground-tab-active' : '');

    var JSTab = React.createElement(
      'div',
      {
        className: JSTabClassName,
        onClick: this.handleCodeModeSwitch.bind(this, this.MODES.JS) },
      'Compiled JS'
    );

    var JSXTab = React.createElement(
      'div',
      {
        className: JSXTabClassName,
        onClick: this.handleCodeModeSwitch.bind(this, this.MODES.JSX) },
      this.props.editorTabTitle
    );

    return React.createElement(
      'div',
      { className: 'playground' },
      React.createElement(
        'div',
        null,
        JSXTab,
        React.createElement(
          'div',
          { className: 'playground-tab playground-tab-active target-tab' },
          React.createElement(
            'div',
            null,
            this.props.elementId
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'playgroundCode' },
        JSXContent
      ),
      React.createElement(
        'div',
        { className: 'playgroundPreview' },
        React.createElement('div', { ref: 'mount', id: this.props.elementId })
      )
    );
  },

  componentDidMount: function componentDidMount() {
    this.executeCode();
  },

  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
    // execute code only when the state's not being updated by switching tab
    // this avoids re-displaying the error, which comes after a certain delay
    if (this.props.transformer !== prevProps.transformer || this.state.code !== prevState.code) {
      this.executeCode();
    }
  },

  executeCode: function executeCode() {
    var mountNode = React.findDOMNode(this.refs.mount);
    Opal.Object.$$proto.$mount_node = function () {
      return mountNode;
    };
    try {
      React.unmountComponentAtNode(mountNode);
    } catch (e) {}

    try {
      var compiledCode = this.compileCode();
      if (this.props.renderCode) {
        React.render(React.createElement(CodeMirrorEditor, { codeText: compiledCode, readOnly: true }), mountNode);
      } else {
        eval(compiledCode);
      }
    } catch (err) {
      this.setTimeout(function () {
        React.render(React.createElement(
          'div',
          { className: 'playgroundError' },
          err.toString()
        ), mountNode);
      }, 500);
    }
  }
});