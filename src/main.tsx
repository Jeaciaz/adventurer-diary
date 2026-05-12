/* @refresh reload */
import { render } from 'solid-js/web';
import { HashRouter, Route } from '@solidjs/router';
import './styles.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

render(
  () => (
    <HashRouter>
      <Route path="/*" component={App} />
    </HashRouter>
  ),
  root,
);
