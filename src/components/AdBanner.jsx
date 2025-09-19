/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect } from 'react';

export default function AdBanner() {
  useEffect(() => {
    try {
      // This push function triggers Google to load an ad into the ad unit.
      // It needs to be called every time the component mounts in case of navigation.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Could not push AdSense ad:', e);
    }
  }, []);

  return (
    <div className="ad-banner-container">
      {/* 
        This is the ad unit.
        IMPORTANT: You must replace the following placeholder values:
        - data-ad-client: Replace "ca-pub-XXXXXXXXXXXXXXXX" with your AdSense Publisher ID.
        - data-ad-slot: Replace "YYYYYYYYYY" with your Ad Unit ID.
      */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="YYYYYYYYYY"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}