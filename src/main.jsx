import { AppRegistry } from 'react-native';

import { RnwApp } from './RnwApp.jsx';
import './styles.css';

AppRegistry.registerComponent('SDRSRnw', () => RnwApp);

const rootNode = document.getElementById('root');

AppRegistry.runApplication('SDRSRnw', {
  rootTag: rootNode,
});
