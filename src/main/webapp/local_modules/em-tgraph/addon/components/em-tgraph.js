import Ember from 'ember';

import layout from '../templates/components/em-tgraph';

import fullscreen from '../utils/fullscreen';
import GraphView from '../utils/graph-view';
import DataProcessor from '../utils/data-processor';

export default Ember.Component.extend({

  layout: layout,

  classNames: ['dag-view-container'],

  errMessage: null,

  isHorizontal: false,
  hideAdditionals: false,
  isFullscreen: false,

  styles: Ember.computed(function () {
    var pathname = window.location.pathname,
        safe = Ember.String.htmlSafe;
    return {
      vertex: safe(`fill: url(${pathname}#vertex-grad); filter: url(${pathname}#grey-glow)`),
      daemonVertex: safe(`fill: url(${pathname}#daemonVertex-grad); filter: url(${pathname}#grey-glow)`),
      input: safe(`fill: url(${pathname}#input-grad); filter: url(${pathname}#grey-glow)`),
      output: safe(`fill: url(${pathname}#output-grad); filter: url(${pathname}#grey-glow)`),
      task: safe(`fill: url(${pathname}#task-grad); filter: url(${pathname}#grey-glow)`),
      io: safe(`fill: url(${pathname}#input-grad); filter: url(${pathname}#grey-glow)`),
      group: safe(`fill: url(${pathname}#group-grad); filter: url(${pathname}#grey-glow)`),
    };
  }),

  _onOrientationChange: function () {
  }.observes('isHorizontal'),

  _onTglAdditionals: function () {
    GraphView.additionalDisplay(this.get('hideAdditionals'));
  }.observes('hideAdditionals'),

  _onTglFullScreen: function () {
    fullscreen.toggle(this.get('element'));
  }.observes('isFullscreen'),

  actions: {
    tglOrientation: function() {
      var isTopBottom = GraphView.toggleLayouts();
      this.set('isHorizontal', !isTopBottom);
    },
    tglAdditionals: function() {
      this.set('hideAdditionals', !this.get('hideAdditionals'));
    },
    fullscreen: function () {
      this.set('isFullscreen', !this.get('isFullscreen'));
    },
    fitGraph: function () {
      GraphView.fitGraph();
    },
    configure: function () {
      this.sendAction('configure');
    }
  },

  didInsertElement: function () {
    var result = DataProcessor.graphifyData(this.get('data'));

    if(typeof result === "string") {
      this.set('errMessage', result);
    }
    else {
      GraphView.create(
        this,
        this.get('element'),
        result
      );
    }
  }

});
