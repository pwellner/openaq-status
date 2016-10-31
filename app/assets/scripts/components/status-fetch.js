'use strict';
import React from 'react';
import moment from 'moment';
import flatten from 'lodash.flatten';

import config from '../config';

const statusMap = {
  'success': {
    'message': 'Fetch seems to be working properly.',
    'classes': 'alert alert--success'
  },
  'apiDown': {
    'message': 'The API is down, can\'t determine the status of OpenAQ fetch',
    'classes': 'alert alert--info'
  },
  'timeAgo': {
    'message': 'The last fetch started more than 10 minutes ago.',
    'classes': 'alert alert--warning'
  },
  'noResults': {
    'message': 'The last five fetches yielded no results.',
    'classes': 'alert alert--warning'
  }
};

var StatusFetch = React.createClass({
  displayName: 'StatusFetch',

  getInitialState: function () {
    return {
      'count': null,
      'status': [],
      'fetches': []
    };
  },

  componentDidMount: function () {
    fetch(`${config.apiBase}${config.apiVersion}/fetches`)
      .then(response => {
        return response.json();
      })
      .catch(err => {
        console.log(err);
      })
      .then(json => {
        let lastResults = json.results.slice(0, 5);
        this.setState({
          'count': lastResults.map(f => f.count).reduce((a, b) => a + b),
          'lastFinish': moment(Date.now()).diff(moment(lastResults[0].timeStarted), 'seconds'),
          'fetches': lastResults.map(f => {
            return {
              'duration': moment(f.timeEnded).diff(moment(f.timeStarted), 'seconds'),
              'failures': flatten(f.results.map(s => {
                let fails = [];
                for (let fail in s.failures) {
                  fails.push(`${s.sourceName} - ${fail} (${s.failures[fail]} failed)`);
                }
                return fails;
              })),
              'measurements': f.count,
              'sources': f.results.length,
              'timeAgo': moment(f.timeEnded).fromNow()
            };
          })
        });
      }).catch(err => {
        this.setState({
          'status': ['apiDown']
        });
        console.log(err);
      }).then(json => {
        // if no status has been set thus far, check for warnings
        if (this.state.status.length === 0) {
          this.setStatus();
        }
      });
  },

  setStatus: function () {
    let statuses = [];
    // check for warnings

    // no new measurements in the last fetches? warning
    if (this.state.count === 0) { statuses.push('noResults'); }
    // last fetch finished over 720 seconds ago? warning
    if (this.state.lastFinish > 720) { statuses.push('timeAgo'); }

    // no warning detected? it must be a success
    if (statuses.length === 0) { statuses.push('success'); }

    this.setState({
      'status': statuses
    });
  },

  renderStatus: function () {
    return (
      <ul className='alert-group'>
        {this.state.status.map((s, i) => {
          return <li className={statusMap[s].classes} key={i}>{statusMap[s].message}</li>;
        })}
      </ul>
    );
  },

  renderFetchSummary: function () { 
    return (
      <div className='fold__body'>
        {this.state.fetches.map((f, i) => {
          return (
            <article className='card' key={i}>
              <div className='card__contents'>
                <header className='card__header'>
                  <p className='card__subtitle'>Fetch finished <strong>{ f.timeAgo }</strong></p>
                </header>
                <div className='card__body'>
                  <dl className='dl-horizontal'>
                    <dt>New measurements</dt>
                    <dd>{ f.measurements }</dd>
                    <dt>Sources reporting</dt>
                    <dd>{ f.sources }</dd>
                    <dt>Total duration</dt>
                    <dd>{ f.duration } seconds</dd>
                    <dt>Failures</dt>
                    { f.failures.map((fail, i) => <dd key={i}>{fail}</dd>) }
                  </dl>
                </div>
              </div>
            </article>
            );
        })}
      </div>
    );
  },

  render: function () {
    return (
      <section className='fold' id='status__fetch'>
        <div className='inner'>
          <header className='fold__header'>
            <h1 className='fold__title'>Fetch health</h1>
          </header>

          {this.renderStatus()}
          {this.renderFetchSummary()}

        </div>
      </section>
    );
  }
});

module.exports = StatusFetch;
