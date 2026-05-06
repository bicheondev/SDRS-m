// Config plugin: pin the Android Gradle wrapper to a specific version.
//
// Why a custom plugin? `expo-build-properties` does not expose a Gradle wrapper /
// distribution URL override (its Android schema is limited to SDK versions,
// build tools, Kotlin, packaging, R8/shrink, maven repos, etc.). The only
// CNG-friendly way to pin the wrapper is to patch
// `android/gradle/wrapper/gradle-wrapper.properties` during prebuild.
//
// React Native 0.79 is not yet validated against Gradle 9.x; this plugin pins
// the wrapper to Gradle 8.13 to keep the Android build green.

const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const DEFAULT_GRADLE_DISTRIBUTION_URL =
  'https\\://services.gradle.org/distributions/gradle-8.13-bin.zip';

function withGradleWrapper(config, { distributionUrl = DEFAULT_GRADLE_DISTRIBUTION_URL } = {}) {
  return withDangerousMod(config, [
    'android',
    async (innerConfig) => {
      const wrapperPath = path.join(
        innerConfig.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties',
      );

      if (!fs.existsSync(wrapperPath)) {
        // Prebuild hasn't generated the wrapper yet — nothing to patch.
        return innerConfig;
      }

      const original = fs.readFileSync(wrapperPath, 'utf8');
      const patched = original.replace(/^distributionUrl=.*/m, `distributionUrl=${distributionUrl}`);

      if (patched !== original) {
        fs.writeFileSync(wrapperPath, patched);
      }

      return innerConfig;
    },
  ]);
}

module.exports = withGradleWrapper;
