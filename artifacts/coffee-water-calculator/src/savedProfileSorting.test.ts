import { describe, expect, it } from 'vitest';
import {
  profilePickerAddedAt,
  sortSavedProfileGroups,
  sortSavedProfileOptions,
  type ProfilePickerOption,
} from './savedProfileSorting';

function recipeOption(name: string, timestamp: number): ProfilePickerOption {
  return {
    value: `recipe:saved-${timestamp.toString(36)}-abcde`,
    label: `Recipe · ${name}`,
  };
}

function profileOption(name: string, timestamp: number): ProfilePickerOption {
  return {
    value: `saved:watermancer-${timestamp}-abcdef`,
    label: `Profile · ${name}`,
  };
}

describe('saved profile picker sorting', () => {
  it('sorts mixed profile and recipe names alphabetically without their kind prefixes', () => {
    const options = [
      profileOption('zulu', 100),
      recipeOption('alpha', 200),
      profileOption('Bravo', 300),
      recipeOption('ALPHA', 400),
    ];

    expect(sortSavedProfileOptions(options, 'name-asc').map(option => option.label)).toEqual([
      'Recipe · alpha',
      'Recipe · ALPHA',
      'Profile · Bravo',
      'Profile · zulu',
    ]);
  });

  it('sorts both generated ID formats by newest and oldest creation time', () => {
    const options = [
      recipeOption('middle', 1_700_000_000_000),
      profileOption('oldest', 1_600_000_000_000),
      profileOption('newest', 1_800_000_000_000),
    ];

    expect(sortSavedProfileOptions(options, 'newest-first').map(option => option.label)).toEqual([
      'Profile · newest',
      'Recipe · middle',
      'Profile · oldest',
    ]);
    expect(sortSavedProfileOptions(options, 'oldest-first').map(option => option.label)).toEqual([
      'Profile · oldest',
      'Recipe · middle',
      'Profile · newest',
    ]);
  });

  it('keeps unreadable legacy IDs in stable order after dated entries', () => {
    const options = [
      { value: 'saved:legacy-profile', label: 'Profile · legacy one' },
      profileOption('dated', 1_700_000_000_000),
      { value: 'recipe:imported-legacy', label: 'Recipe · legacy two' },
    ];

    expect(sortSavedProfileOptions(options, 'newest-first').map(option => option.label)).toEqual([
      'Profile · dated',
      'Profile · legacy one',
      'Recipe · legacy two',
    ]);
    expect(profilePickerAddedAt('saved:legacy-profile')).toBeNull();
  });

  it('sorts only saved values and leaves catalog option order in place', () => {
    const groups = [{
      label: 'Watermancer profiles',
      options: [
        { value: 'profile:built-in-a', label: 'A built-in profile' },
        profileOption('zulu', 100),
        { value: 'profile:built-in-b', label: 'B built-in profile' },
        recipeOption('alpha', 200),
      ],
    }];

    expect(sortSavedProfileGroups(groups, 'name-asc', [
      groups[0].options[1].value,
      groups[0].options[3].value,
    ])[0].options.map(option => option.label)).toEqual([
      'A built-in profile',
      'Recipe · alpha',
      'B built-in profile',
      'Profile · zulu',
    ]);
  });
});