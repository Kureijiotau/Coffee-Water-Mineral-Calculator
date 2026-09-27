export type ProfilePickerSortMode = 'name-asc' | 'newest-first' | 'oldest-first';

export type ProfilePickerOption = {
  value: string;
  label: string;
};

export type ProfilePickerGroup<TOption extends ProfilePickerOption = ProfilePickerOption> = {
  options: TOption[];
};

const PROFILE_PICKER_SORT_STORAGE_KEY = 'coffee-water-profile-picker-sort-mode';
const DEFAULT_PROFILE_PICKER_SORT_MODE: ProfilePickerSortMode = 'name-asc';

const PROFILE_PICKER_SORT_MODES = new Set<ProfilePickerSortMode>([
  'name-asc',
  'newest-first',
  'oldest-first',
]);

export function loadProfilePickerSortMode(): ProfilePickerSortMode {
  try {
    const stored = localStorage.getItem(PROFILE_PICKER_SORT_STORAGE_KEY);
    return stored && PROFILE_PICKER_SORT_MODES.has(stored as ProfilePickerSortMode)
      ? stored as ProfilePickerSortMode
      : DEFAULT_PROFILE_PICKER_SORT_MODE;
  } catch {
    return DEFAULT_PROFILE_PICKER_SORT_MODE;
  }
}

export function saveProfilePickerSortMode(mode: ProfilePickerSortMode): void {
  try {
    localStorage.setItem(PROFILE_PICKER_SORT_STORAGE_KEY, mode);
  } catch {
    // Keep the current in-memory sort if local storage is unavailable.
  }
}

export function profilePickerAddedAt(value: string): number | null {
  const id = value.replace(/^(?:saved|recipe):/, '');
  const watermancerMatch = id.match(/^watermancer-(\d+)-/);
  if (watermancerMatch) {
    const timestamp = Number(watermancerMatch[1]);
    return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
  }

  const recipeMatch = id.match(/^saved-([0-9a-z]+)-/i);
  if (!recipeMatch) return null;
  const timestamp = Number.parseInt(recipeMatch[1], 36);
  return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
}

function profilePickerName(label: string): string {
  return label.replace(/^(?:Profile|Recipe)\s*·\s*/i, '').trim();
}

export function sortSavedProfileOptions<TOption extends ProfilePickerOption>(
  options: TOption[],
  mode: ProfilePickerSortMode,
): TOption[] {
  return options
    .map((option, index) => ({
      option,
      index,
      addedAt: profilePickerAddedAt(option.value),
    }))
    .sort((a, b) => {
      if (mode === 'name-asc') {
        const byName = profilePickerName(a.option.label).localeCompare(
          profilePickerName(b.option.label),
          undefined,
          { sensitivity: 'base', numeric: true },
        );
        return byName || a.index - b.index;
      }

      if (a.addedAt === null && b.addedAt !== null) return 1;
      if (a.addedAt !== null && b.addedAt === null) return -1;
      if (a.addedAt !== null && b.addedAt !== null && a.addedAt !== b.addedAt) {
        return mode === 'newest-first'
          ? b.addedAt - a.addedAt
          : a.addedAt - b.addedAt;
      }
      return a.index - b.index;
    })
    .map(({ option }) => option);
}

export function sortSavedProfileGroups<
  TOption extends ProfilePickerOption,
  TGroup extends ProfilePickerGroup<TOption>,
>(
  groups: TGroup[],
  mode: ProfilePickerSortMode,
  sortableValues: string[],
): TGroup[] {
  const sortable = new Set(sortableValues);
  return groups.map(group => {
    const savedOptions = group.options.filter(option => sortable.has(option.value));
    if (savedOptions.length < 2) return group;

    const sortedOptions = sortSavedProfileOptions(savedOptions, mode);
    let nextSortedIndex = 0;
    return {
      ...group,
      options: group.options.map(option => (
        sortable.has(option.value) ? sortedOptions[nextSortedIndex++] : option
      )),
    };
  });
}