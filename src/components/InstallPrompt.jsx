/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from '../lib/store';
import { promptToInstall, dismissInstallPrompt } from '../lib/actions';

export default function InstallPrompt() {
  const canInstall = useStore(state => state.canInstall);

  if (!canInstall) {
    return null;
  }

  const handleInstall = () => {
    promptToInstall();
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
  };

  return (
    <div className="install-prompt-banner">
      <div className="install-prompt-content">
        <span className="icon">install_desktop</span>
        <div>
          <h4>Install Echo Expedition</h4>
          <p>Add the app to your home screen for quick and easy access.</p>
        </div>
      </div>
      <div className="install-prompt-actions">
        <button className="button" onClick={handleDismiss}>Not Now</button>
        <button className="button primary" onClick={handleInstall}>Install</button>
      </div>
    </div>
  );
}