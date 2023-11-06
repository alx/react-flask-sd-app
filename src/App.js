import React from 'react';
import { BrowserRouter, Link, Switch, Route } from 'react-router-dom';
import './App.css';

import WebcamProcessor from './WebcamProcessor'

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Switch>
          <Route exact path="/">
              <WebcamProcessor />
          </Route>
        </Switch>
        <div>
          <Link className="App-link" to="https://github.com/alx/react-flask-sd">react-flask-sd</Link>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
