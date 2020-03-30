import * as async from 'async';
import { browser } from 'webextension-polyfill-ts';
import { Gitlab } from 'gitlab'; // All Resources
import { getSettings } from './utils/getSettings';
import { fetchMRExtraInfo } from './utils/fetchMRExtraInfo';
import { MergeRequests, GetSettingsResponse, MergeRequestsDetails } from './types';

let ERROR_TRACKER: Error;

const pollMR = (cb: Callback<boolean>) => {
    interface ReviewRequests {
        mrAssigned: MergeRequestsDetails[];
        mrToReview: number;
    }

    interface ReviewGiven {
        mrGiven: MergeRequestsDetails[];
        mrReviewed: number;
    }

    interface AsyncResults {
        getSettings: GetSettingsResponse;
        gitlabApi: Gitlab;
        reviewRequests: ReviewRequests;
        givenRequests: ReviewGiven;
        saveLocalStorage: void;
    }

    async.auto<AsyncResults>(
        {
            getSettings: (cb) => getSettings(cb),
            gitlabApi: [
                'getSettings',
                (results, cb) => {
                    console.log('>> POLLING GITLAB API');

                    if (!results.getSettings) {
                        browser.browserAction.setBadgeText({
                            text: ''
                        });

                        return cb(new Error('Fail fetching settings.'));
                    }

                    if (!results.getSettings.token) {
                        return cb(new Error('No Gitlab token set, visit options.'));
                    }
                    if (!results.getSettings.address) {
                        return cb(new Error('No Gitlab host address set, visit options.'));
                    }

                    const api = new Gitlab({
                        host: results.getSettings.address,
                        token: results.getSettings.token
                    });

                    return cb(null, api);
                }
            ],
            reviewRequests: [
                'gitlabApi',
                (results, cb) => {
                    const { gitlabApi } = results;

                    gitlabApi.MergeRequests.all({
                        state: 'opened',
                        scope: 'assigned_to_me',
                        wip: 'no'
                    })
                        .then((response) => {
                            const mrAssignedList = response as MergeRequests[];
                            return fetchMRExtraInfo(gitlabApi, mrAssignedList, (error, mrAssignedDetails) => {
                                if (error) {
                                    return cb(error);
                                }

                                let mrToReview = 0;
                                mrAssignedDetails.forEach((mr) => {
                                    if (!mr.approvals.user_has_approved) {
                                        mrToReview += 1;
                                    }
                                });

                                browser.browserAction.setBadgeText({
                                    text: mrToReview === 0 ? '' : mrToReview.toString()
                                });

                                return cb(null, {
                                    mrAssigned: mrAssignedDetails,
                                    mrToReview
                                });
                            });
                        })
                        .catch((error: Error) => {
                            if (error) {
                                return cb(error);
                            }
                        });
                }
            ],
            givenRequests: [
                'gitlabApi',
                (results, cb) => {
                    const { gitlabApi } = results;

                    gitlabApi.MergeRequests.all({
                        state: 'opened',
                        scope: 'created_by_me'
                    })
                        .then((response) => {
                            const mrGivenList = response as MergeRequests[];
                            return fetchMRExtraInfo(gitlabApi, mrGivenList, (error, mrGivenDetails) => {
                                if (error) {
                                    return cb(error);
                                }

                                let mrReviewed = 0;
                                mrGivenDetails.forEach((mr) => {
                                    if (mr.approvals.approved) {
                                        mrReviewed += 1;
                                    }
                                });

                                return cb(null, {
                                    mrGiven: mrGivenDetails,
                                    mrReviewed
                                });
                            });
                        })
                        .catch((error: Error) => {
                            if (error) {
                                return cb(error);
                            }
                        });
                }
            ],
            saveLocalStorage: [
                'reviewRequests',
                'givenRequests',
                (results, cb) => {
                    const { mrAssigned, mrToReview } = results.reviewRequests;
                    const { mrGiven, mrReviewed } = results.givenRequests;
                    const lastUpdateDateUnix = new Date().getTime();

                    browser.storage.local
                        .set({
                            mrAssigned,
                            mrToReview,
                            mrGiven,
                            mrReviewed,
                            lastUpdateDateUnix
                        })
                        .then(() => cb())
                        .catch((error) => cb(error));
                }
            ]
        },
        (error: Error) => {
            if (error) {
                ERROR_TRACKER = error;
                console.error('POLL API', error);
                return cb(error, false);
            }

            ERROR_TRACKER = null;
            return cb(null, true);
        }
    );
};

console.log('background script loaded');
pollMR(() => null);
setInterval(function run() {
    pollMR(() => null);
}, 30000);

browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'getMRs') {
        if (ERROR_TRACKER) {
            return Promise.resolve({ error: ERROR_TRACKER.message });
        }

        return Promise.resolve(
            browser.storage.local.get(['mrAssigned', 'mrGiven', 'mrToReview', 'mrReviewed', 'lastUpdateDateUnix'])
        );
    }

    if (message.type === 'pollMR') {
        return new Promise((resolve) => pollMR((_error, result) => resolve(result)));
    }
});