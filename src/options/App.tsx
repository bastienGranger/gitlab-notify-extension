import * as browser from 'webextension-polyfill';
import { useState, useCallback, useEffect } from 'react';
import {
    Button,
    Box,
    Checkbox,
    TextInput,
    Text,
    Tooltip,
    StyledOcticon,
    Link,
    FormControl,
    Select,
    ThemeProvider
} from '@primer/react';
import {
    KeyIcon,
    ServerIcon,
    PackageDependenciesIcon,
    CheckIcon,
    InfoIcon,
    ClockIcon,
    FileDirectoryIcon
} from '@primer/octicons-react';
import './style.css';
import { updateConfiguration, readConfiguration } from '../common/configuration';
import { TabId } from '../common/types';

const getSettings = readConfiguration([
    'gitlabCE',
    'gitlabToken',
    'gitlabAddress',
    'refreshRate',
    'defaultTab',
    'alertBadgeCounters',
    'draftInToReviewTab',
    'projectDirectoryPrefix'
]);

export const App = () => {
    const [gitlabCE, setGitlabCE] = useState<boolean>(false);
    const [gitlabToken, setGitlabToken] = useState('');
    const [gitlabAddress, setGitlabAddress] = useState('');
    const [refreshRate, setRefreshRate] = useState(40);
    const [defaultTab, setDefaultTab] = useState<TabId>('to_review');
    const [alertBadgeCounters, setAlertBadgeCounters] = useState([0]);
    const [draftInToReviewTab, setDraftInToReviewTab] = useState<boolean>(true);
    const [projectDirectoryPrefix, setProjectDirectoryPrefix] = useState<string>('');
    const [testSuccess, setTestSuccess] = useState(null);
    const [isGitlabTokenInLocalStorage, setIsGitlabTokenInLocalStorage] = useState<boolean>(false);
    const [isGitlabAddressInLocalStorage, setIsGitlabAddressInLocalStorage] = useState<boolean>(false);
    const [isRefreshRateInLocalStorage, setIsRefreshRateInLocalStorage] = useState<boolean>(false);

    useEffect(() => {
        getSettings.then((settings) => {
            setGitlabCE(Boolean(settings.gitlabCE));

            setGitlabToken(settings.gitlabToken ?? '');
            setIsGitlabTokenInLocalStorage(settings.gitlabToken);

            setGitlabAddress(settings.gitlabAddress ?? '');
            setIsGitlabAddressInLocalStorage(settings.gitlabAddress);

            setRefreshRate(settings.refreshRate ?? 40);
            setIsRefreshRateInLocalStorage(settings.refreshRate);

            setDefaultTab(settings.defaultTab ?? 'to_review');

            setAlertBadgeCounters(settings.alertBadgeCounters ? Array.from(settings.alertBadgeCounters) : []);

            setDraftInToReviewTab(settings.draftInToReviewTab ?? true);

            setProjectDirectoryPrefix(settings.projectDirectoryPrefix ?? '');
        });
    }, []);

    const updateGitlabCE = async (event: any) => {
        setGitlabCE(event.target.checked);
        await updateConfiguration({ gitlabCE: event.target.checked });
    };

    const updateGitlabToken = async (event: any) => {
        setGitlabToken(event.target.value);
        await updateConfiguration({ gitlabToken: event.target.value });
        setIsGitlabTokenInLocalStorage(true);
    };

    const updateGitlabAddress = async (event: any) => {
        setGitlabAddress(event.target.value);
        await updateConfiguration({ gitlabAddress: event.target.value });
        setIsGitlabAddressInLocalStorage(true);
    };

    const updateRefreshRate = async (event: any) => {
        setRefreshRate(event.target.value);
        await updateConfiguration({ refreshRate: parseInt(event.target.value) });
        setIsRefreshRateInLocalStorage(true);
        await browser.runtime.sendMessage({ type: 'updateRefreshRate', interval: event.target.value });
    };

    const updateDefaultTab = async (event: any) => {
        setDefaultTab(event.target.value);
        await updateConfiguration({ defaultTab: event.target.value });
    };

    const updateAlertBadgeCounters = async (event: any) => {
        const options = [...event.target.selectedOptions].map((option) => parseInt(option.value));
        setAlertBadgeCounters(options);
        await updateConfiguration({ alertBadgeCounters: options });
    };

    const updateDraftInToReviewTab = async (event: any) => {
        setDraftInToReviewTab(event.target.checked);
        await updateConfiguration({ draftInToReviewTab: event.target.checked });
    };

    const updateProjectDirectoryPrefix = async (event: any) => {
        setProjectDirectoryPrefix(event.target.value);
        await updateConfiguration({ projectDirectoryPrefix: event.target.value });
    };

    const testConnection = useCallback(() => {
        browser.runtime.sendMessage({ type: 'getLatestDataFromGitLab' }).then((success) => setTestSuccess(success));
    }, []);

    return (
        <ThemeProvider colorMode="auto">
            <Box display="grid" gridGap={3} sx={{ width: 500, p: 2, pl: 4, pr: 6, bg: 'canvas.default' }}>
                <FormControl>
                    <FormControl.Label>Using GitLab Community Edition</FormControl.Label>
                    <Checkbox
                        type="checkbox"
                        name="gitlabCE"
                        value="GitLab CE Mode"
                        onChange={updateGitlabCE}
                        checked={gitlabCE}
                    />
                    <FormControl.Caption>(approvals are a premium feature)</FormControl.Caption>
                </FormControl>
                <FormControl>
                    <FormControl.Label>
                        Personal GitLab Token{' '}
                        <Link
                            href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html"
                            target="_blank"
                        >
                            <Tooltip
                                wrap={true}
                                aria-label="Click to open GitLab documentation.
                    The extension requires 'api' right (or just 'read_api' but all write operations will fail)."
                            >
                                <StyledOcticon icon={InfoIcon} size={15} color="blue.5" />
                            </Tooltip>
                        </Link>
                    </FormControl.Label>
                    <TextInput
                        type="password"
                        leadingVisual={KeyIcon}
                        trailingVisual={isGitlabTokenInLocalStorage ? CheckIcon : undefined}
                        block
                        variant={'small'}
                        name="gitlab-token"
                        value={gitlabToken}
                        placeholder="<your_token_here>"
                        onChange={updateGitlabToken}
                        aria-label="gitlab-token"
                    />
                </FormControl>
                <FormControl>
                    <FormControl.Label>
                        GitLab Host Address{' '}
                        <Tooltip aria-label="Example: https://gitlab.com">
                            <StyledOcticon icon={InfoIcon} size={15} color="blue.5" />
                        </Tooltip>
                    </FormControl.Label>
                    <TextInput
                        leadingVisual={ServerIcon}
                        trailingVisual={isGitlabAddressInLocalStorage ? CheckIcon : undefined}
                        block
                        variant={'small'}
                        name="gitlab-address"
                        value={gitlabAddress}
                        placeholder="<host_address_here>"
                        onChange={updateGitlabAddress}
                        aria-label="gitlab-address"
                    />
                </FormControl>
                <FormControl>
                    <FormControl.Label>
                        Refresh rate in seconds{' '}
                        <Tooltip aria-label="It is not recommended to go below 30 seconds.">
                            <StyledOcticon icon={InfoIcon} size={15} color="blue.5" />
                        </Tooltip>
                    </FormControl.Label>
                    <TextInput
                        leadingVisual={ClockIcon}
                        trailingVisual={isRefreshRateInLocalStorage ? CheckIcon : undefined}
                        block
                        type="number"
                        name="refreshRate"
                        min="20"
                        value={refreshRate}
                        placeholder="0"
                        onChange={updateRefreshRate}
                    />
                </FormControl>
                <FormControl>
                    <FormControl.Label>Default tab</FormControl.Label>
                    <Select name="default-tab" onChange={updateDefaultTab}>
                        <Select.Option selected={defaultTab === 'to_review'} value="to_review">
                            To Review
                        </Select.Option>
                        <Select.Option selected={defaultTab === 'under_review'} value="under_review">
                            Under Review
                        </Select.Option>
                        <Select.Option selected={defaultTab === 'drafts'} value="drafts">
                            Drafts
                        </Select.Option>
                        <Select.Option selected={defaultTab === 'issues'} value="issues">
                            Issues
                        </Select.Option>
                        <Select.Option selected={defaultTab === 'todo_list'} value="todo_list">
                            To-Do List
                        </Select.Option>
                    </Select>
                </FormControl>
                <FormControl>
                    <FormControl.Label>
                        Alert badge counters{' '}
                        <Tooltip aria-label="You can select multiple counters but display might be too small.">
                            <StyledOcticon icon={InfoIcon} size={15} color="blue.5" />
                        </Tooltip>
                    </FormControl.Label>
                    <select name="alert-badge-counters" multiple onChange={updateAlertBadgeCounters}>
                        <option selected={alertBadgeCounters.includes(0)} value="0">
                            To Review
                        </option>
                        <option selected={alertBadgeCounters.includes(1)} value="1">
                            Reviewed by others
                        </option>
                        <option selected={alertBadgeCounters.includes(2)} value="2">
                            Issues
                        </option>
                        <option selected={alertBadgeCounters.includes(3)} value="3">
                            To-Do List
                        </option>
                    </select>
                </FormControl>
                <FormControl>
                    <FormControl.Label>View draft MRs in &quot;To Review&quot; tab</FormControl.Label>
                    <Checkbox
                        type="checkbox"
                        name="draftInToReviewTab"
                        value="View draft in To Review tab"
                        onChange={updateDraftInToReviewTab}
                        checked={draftInToReviewTab}
                    />
                    <FormControl.Caption>
                        (merge requests marked as &quot;Draft:&quot; will be ignored if unchecked)
                    </FormControl.Caption>
                </FormControl>
                <FormControl>
                    <FormControl.Label>
                        Projects directory prefix{' '}
                        <Tooltip
                            aria-label="Sometimes your project are in a sub-directory like 'teams/code/projects/'
                            which makes the project name difficult to read.
                            Set a prefix here that will be substitute each time."
                        >
                            <StyledOcticon icon={InfoIcon} size={15} color="blue.5" />
                        </Tooltip>
                    </FormControl.Label>
                    <TextInput
                        leadingVisual={FileDirectoryIcon}
                        block
                        variant={'small'}
                        name="project-directory-prefix"
                        value={projectDirectoryPrefix}
                        placeholder="teams/code/projects/"
                        onChange={updateProjectDirectoryPrefix}
                        aria-label="project-directory-prefix"
                    />
                </FormControl>

                <>
                    <Button onClick={testConnection} block variant="default">
                        <PackageDependenciesIcon /> Test my settings
                    </Button>
                    <Text
                        opacity={testSuccess === null ? 0 : 100}
                        sx={{
                            color: testSuccess === true ? 'success.fg' : 'danger.fg',
                            fontSize: 18,
                            textAlign: 'center'
                        }}
                    >
                        {testSuccess === true ? 'Success' : 'Could not connect'}
                    </Text>
                </>
            </Box>
        </ThemeProvider>
    );
};
