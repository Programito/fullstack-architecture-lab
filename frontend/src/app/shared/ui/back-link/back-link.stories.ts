import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BackLink } from './back-link';

type BackLinkStoryArgs = {
  label: string;
  routerLink: string;
};

const meta: Meta<BackLinkStoryArgs> = {
  title: 'Shared UI/BackLink',
  component: BackLink,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      // A real provideRouter() wires the Router to the browser's actual Location/History
      // (PlatformLocation), which is shared at the platform level across every story
      // rendered in the Storybook iframe. Storybook itself owns that iframe's URL/history
      // to track which story is selected, so a real Router listening for popstate (or
      // pushing state on a RouterLink click to a route that doesn't exist, since there are
      // no routes configured) fights with Storybook's own navigation and can leave a
      // dangling navigation stream that completes without emitting (rxjs EmptyError),
      // corrupting the shared app for every story rendered afterwards.
      // provideLocationMocks() swaps Location/LocationStrategy for in-memory mocks so the
      // Router never touches the real browser URL/history at all — RouterLink still
      // resolves hrefs and reacts to clicks internally, but nothing leaks outside this story.
      providers: [provideRouter([], withDisabledInitialNavigation()), provideLocationMocks()],
    }),
  ],
  args: {
    label: 'Recursos developer',
    routerLink: '/developer',
  },
  render: (args) => ({
    props: args,
    template: '<app-back-link [label]="label" [routerLink]="routerLink" />',
  }),
};

export default meta;

type Story = StoryObj<BackLinkStoryArgs>;

export const Default: Story = {};
