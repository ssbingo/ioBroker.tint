'use strict';

/**
 * Trims raw deCONZ light/group objects down to only the fields the admin
 * UI tabs actually read (admin/src/components/LightsTab.jsx, PlugsTab.jsx,
 * CoversTab.jsx, GroupsTab.jsx, GroupDialog.jsx, ScenesTab.jsx,
 * deviceCategory.js).
 *
 * Why this exists: deCONZ's raw /lights payload includes large, unused
 * fields per light — most notably "capabilities" (color gamut points,
 * effect/alert enum lists, etc.), plus etag/lastannounced/swversion/
 * uniqueid/hascolor that no admin tab displays. For an installation with
 * ~30 lights this raw payload is tens of KB; sending it verbatim over the
 * same socket.io connection admin uses to track host-alive heartbeats can
 * make the browser's main thread busy parsing/rendering it long enough to
 * delay heartbeat processing, which iobroker.admin's HostSelectors
 * component (adminWww bootstrap bundle) interprets as the host going
 * briefly "not alive" — surfacing as a red, "switch host" warning despite
 * nothing actually being wrong. Trimming the response to only what's
 * displayed removes the root cause instead of just the symptom.
 */

/**
 * @param {object} light - Raw deCONZ light object
 * @returns {object} Minimal projection used by the admin Lights/Plugs/Covers tabs
 */
function trimLightForAdmin(light) {
	const s = light?.state || {};
	return {
		name: light?.name,
		modelid: light?.modelid,
		manufacturername: light?.manufacturername,
		type: light?.type,
		state: {
			on: s.on,
			bri: s.bri,
			reachable: s.reachable,
			lift: s.lift,
			open: s.open,
		},
	};
}

/**
 * @param {object} group - Raw deCONZ group object
 * @returns {object} Minimal projection used by the admin Groups/Scenes tabs
 */
function trimGroupForAdmin(group) {
	const st = group?.state || {};
	return {
		name: group?.name,
		lights: group?.lights,
		scenes: group?.scenes,
		state: {
			all_on: st.all_on,
			any_on: st.any_on,
		},
	};
}

module.exports = { trimLightForAdmin, trimGroupForAdmin };
