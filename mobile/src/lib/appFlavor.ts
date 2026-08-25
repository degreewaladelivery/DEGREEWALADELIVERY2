import { NativeModules } from 'react-native';

/**
 * Whether this build is the delivery partner app.
 *
 * The two apps share one codebase and are separated by a Gradle flavour. Read
 * from a native constant rather than an async call so it is known before the
 * first render — an async check would flash the wrong app on screen while it
 * resolved.
 *
 * Defaults to false if the native module is missing, so anything unexpected
 * lands on the customer app rather than exposing the partner screens.
 */
export const IS_AGENT_APP: boolean =
  NativeModules?.DeliveryTracking?.isAgentApp === true;
