import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Group } from '../api';
import { useAuth } from '../context/useAuth';

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setGroups([]);
      return;
    }

    void loadGroups();
  }, [token]);

  async function loadGroups() {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.getGroups();
      setGroups(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load groups');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      navigate('/login', {
        state: { message: 'Please log in to create a group.' },
      });
      return;
    }

    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const created = await api.createGroup({ name: groupName.trim() });
      setGroups((current) => [created, ...current]);
      setGroupName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create group');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="glass-card grid gap-6 rounded-[2rem] p-6 lg:grid-cols-[1.16fr_0.84fr]">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.28em] text-sky-700">Dashboard</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-900">
            Keep every shared plan tidy, visual, and easy to settle.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Create a new group for a trip, household, or event, then jump into the details to manage members and track activity.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-panel rounded-[1.5rem] p-4">
              <p className="text-sm text-slate-500">Groups</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{groups.length}</p>
            </div>
            <div className="soft-panel rounded-[1.5rem] p-4">
              <p className="text-sm text-slate-500">Experience</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Mobile ready</p>
            </div>
            <div className="soft-panel rounded-[1.5rem] p-4">
              <p className="text-sm text-slate-500">Settlement</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Built in</p>
            </div>
          </div>
        </div>

        <form className="soft-panel rounded-[1.75rem] p-5" onSubmit={handleCreateGroup}>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Create a group</h2>
            <p className="text-sm text-slate-600">
              Start with a clear name so everyone knows what this group is for.
            </p>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-sm text-slate-700">Group name</span>
            <input
              required
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Halifax weekend trip"
              className="form-input"
            />
          </label>

          <button type="submit" disabled={isCreating} className="primary-button mt-5 w-full px-4 py-3">
            {token ? (isCreating ? 'Creating group...' : 'Create group') : 'Log in to create a group'}
          </button>
        </form>
      </section>

      {!token ? (
        <section className="glass-card space-y-5 rounded-[2rem] p-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-sky-700">Try the workflow</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              The app asks for login when you try a protected action.
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              Browse the product first, then sign in when you want to create a group, add a friend, or record an expense.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                navigate('/login', {
                  state: { message: 'Please log in to create a group.' },
                })
              }
              className="soft-panel rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5"
            >
              <p className="text-sm text-slate-500">Action</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Create group</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start a shared trip, home, or event workspace.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/login', {
                  state: { message: 'Please log in to add friends to a group.' },
                })
              }
              className="soft-panel rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5"
            >
              <p className="text-sm text-slate-500">Action</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Add friend</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Invite existing users by email once you are signed in.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/login', {
                  state: { message: 'Please log in to add an expense.' },
                })
              }
              className="soft-panel rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5"
            >
              <p className="text-sm text-slate-500">Action</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Add expense</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Record who paid and let SmartSplit calculate the split.
              </p>
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Your groups</h2>
          <p className="text-sm text-slate-500">{groups.length} total</p>
        </div>

        {isLoading ? (
          <div className="glass-card rounded-[2rem] p-8 text-sm text-slate-600">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="glass-card rounded-[2rem] border-dashed p-8 text-sm text-slate-600">
            No groups yet. Create your first one above to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="glass-card rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 hover:bg-white/95"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{group.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                    {group._count?.expenses ?? 0} expenses
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
                  <span>{group.members.length} members</span>
                  <span className="font-medium text-sky-700">Open group</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
