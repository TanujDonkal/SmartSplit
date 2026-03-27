import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Group } from '../api';

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadGroups();
  }, []);

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
      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">Dashboard</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight">
            Organize shared expenses by group before the receipts start piling up.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Create a new group for a trip, household, or event, then jump into the details to manage members and track activity.
          </p>
        </div>

        <form
          className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5"
          onSubmit={handleCreateGroup}
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Create a group</h2>
            <p className="text-sm text-slate-400">
              Start with a clear name so everyone knows what this group is for.
            </p>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-sm text-slate-200">Group name</span>
            <input
              required
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Halifax weekend trip"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/25"
            />
          </label>

          <button
            type="submit"
            disabled={isCreating}
            className="mt-5 w-full rounded-2xl bg-cyan-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-100"
          >
            {isCreating ? 'Creating group...' : 'Create group'}
          </button>
        </form>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Your groups</h2>
          <p className="text-sm text-slate-400">{groups.length} total</p>
        </div>

        {isLoading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-8 text-sm text-slate-300">
            Loading groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/6 p-8 text-sm text-slate-300">
            No groups yet. Create your first one above to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{group.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-cyan-400/12 px-3 py-1 text-xs font-medium text-cyan-200">
                    {group._count?.expenses ?? 0} expenses
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm text-slate-300">
                  <span>{group.members.length} members</span>
                  <span className="text-cyan-200">Open group</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
