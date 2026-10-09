import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { useSimulation } from '@/store/simulation';
import { defaultConfig } from '@/domain/defaults';
import { expenditureAt } from '@/domain/simulate';
import { MS_PER_DAY, MS_PER_YEAR, formatMoney } from '@/domain/money';

vi.mock('@/components/charts/Chart', () => ({
  Chart: ({ ariaLabel }: { ariaLabel: string }) => <div data-testid="chart">{ariaLabel}</div>,
}));

vi.mock('@/components/rack/RackVisual', () => ({
  RackVisual: () => <div data-testid="rack" />,
}));

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

async function goToDashboard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /explore a sample system/i }));
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /financial dashboard/i })).toBeInTheDocument();
  });
  await waitFor(() => {
    expect(useSimulation.getState().phase).toBe('running');
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useSimulation.setState({
    config: defaultConfig(),
    plan: useSimulation.getState().plan,
    phase: 'draft',
    bankedMs: 0,
    anchorWallMs: null,
    startDate: null,
    scenarios: [],
  });
  useSimulation.getState().replaceConfig(defaultConfig());
});

describe('the opening screen', () => {
  it('shows the product promise and both entry actions', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('You bought the hardware once');
    expect(screen.getByRole('link', { name: /configure my infrastructure/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore a sample system/i })).toBeInTheDocument();
  });

  it('reads the opening total from the simulation rather than a hardcoded figure', () => {
    renderApp();
    const state = useSimulation.getState();
    expect(screen.getAllByText(formatMoney(state.plan.derived.initialCapexPaise)).length).toBeGreaterThan(0);
  });

  it('lists the bundled starting profiles', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /small office database/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enterprise storage environment/i })).toBeInTheDocument();
  });
});

describe('the required user journey', () => {
  it('commissions a sample system, runs the clock and books the acquisition', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /explore a sample system/i }));

    await waitFor(() => {
      expect(useSimulation.getState().phase).toBe('running');
    });

    const state = useSimulation.getState();
    expect(state.startDate).not.toBeNull();
    const acquisitions = state.plan.events.filter((event) => event.atMs === 0);
    expect(acquisitions.length).toBeGreaterThan(5);
    expect(
      acquisitions.reduce((sum, event) => sum + event.amountPaise, 0),
    ).toBe(state.plan.derived.initialCapexPaise);
  });

  it('accumulates expenditure from simulated time, not from frames', async () => {
    const user = userEvent.setup();
    renderApp();
    await goToDashboard(user);

    useSimulation.getState().pause();
    useSimulation.getState().advance(MS_PER_YEAR * 3);

    const state = useSimulation.getState();
    expect(state.bankedMs).toBeGreaterThanOrEqual(MS_PER_YEAR * 3);
    expect(state.anchorWallMs).toBeNull();
    const shown = formatMoney(expenditureAt(state.plan, state.bankedMs));

    await waitFor(() => {
      expect(screen.getAllByText(shown).length).toBeGreaterThan(0);
    });
  });

  it('produces the same total for the same simulated period at every speed', async () => {
    renderApp();
    useSimulation.getState().purchase();
    const plan = useSimulation.getState().plan;

    const totals = (['1x', '60x', 'day', 'month', 'year'] as const).map((speed) => {
      useSimulation.setState({ speed, bankedMs: 0, anchorWallMs: null, phase: 'paused' });
      useSimulation.getState().advance(MS_PER_YEAR * 5);
      return expenditureAt(plan, useSimulation.getState().bankedMs);
    });

    totals.forEach((total) => expect(total).toBe(totals[0]));
    expect(totals[0]).toBeGreaterThan(plan.derived.initialCapexPaise);
  });

  it('steps through the lifecycle and records scheduled events', async () => {
    renderApp();
    useSimulation.getState().purchase();
    useSimulation.getState().advance(MS_PER_YEAR * 6);

    const state = useSimulation.getState();
    const booked = state.plan.events.filter((event) => event.atMs <= state.bankedMs);
    expect(booked.some((event) => event.category === 'maintenance')).toBe(true);
    expect(booked.some((event) => event.category === 'support')).toBe(true);
    expect(booked.some((event) => event.category === 'electricity')).toBe(true);
    expect(booked.some((event) => event.category === 'replacement')).toBe(true);
  });
});

describe('the dashboard workspace', () => {
  it('exposes the lifecycle controls, the ledger link and the receipt', async () => {
    const user = userEvent.setup();
    renderApp();
    await goToDashboard(user);

    expect(screen.getByRole('button', { name: /^pause$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full ledger/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /generate cost receipt/i }));
    await waitFor(() => {
      expect(screen.getByText('Total net ownership cost')).toBeInTheDocument();
    });
  });
});

describe('the ledger', () => {
  it('reconciles with the counter and can be filtered', async () => {
    const user = userEvent.setup();
    renderApp();
    await goToDashboard(user);

    useSimulation.getState().pause();
    useSimulation.getState().advance(MS_PER_YEAR * 4);

    await user.click(screen.getAllByRole('link', { name: /open full ledger/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /physical cost ledger/i })).toBeInTheDocument();
    });

    const state = useSimulation.getState();
    const booked = state.plan.events
      .filter((event) => event.atMs <= state.bankedMs)
      .reduce((sum, event) => sum + (event.credit ? -event.amountPaise : event.amountPaise), 0);

    expect(screen.getAllByText(formatMoney(booked)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByText(/energy accrued, not yet billed/i)).toBeInTheDocument();

    const search = screen.getByLabelText('Search ledger entries');
    await user.type(search, 'electricity');
    await waitFor(() => {
      expect(screen.queryByText(/Database administration/)).not.toBeInTheDocument();
    });
  });
});

describe('the studio', () => {
  it('recalculates the projection when a component changes', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole('link', { name: /configure my infrastructure/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /build studio/i })).toBeInTheDocument();
    });

    const before = useSimulation.getState().plan.derived.initialCapexPaise;
    expect(screen.getByRole('slider', { name: 'Data drives' })).toBeInTheDocument();

    useSimulation.getState().patchConfig('storage', { driveCount: 60 });

    const after = useSimulation.getState().plan.derived.initialCapexPaise;
    expect(after).toBeGreaterThan(before);
    expect(screen.getByRole('button', { name: /buy and start the clock/i })).toBeInTheDocument();
  });
});

describe('saving and comparing scenarios', () => {
  it('saves the current build and lists it in the lab', async () => {
    const user = userEvent.setup();
    renderApp();

    useSimulation.getState().setScenarioName('Baseline nearline build');
    await user.click(screen.getAllByRole('link', { name: /^compare$/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /scenario lab/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save current build/i }));

    await waitFor(() => {
      expect(useSimulation.getState().scenarios).toHaveLength(1);
    });
    expect(screen.getByRole('checkbox', { name: /compare baseline nearline build/i })).toBeChecked();
  });

  it('plots a synchronised comparison once a second scenario is selected', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole('link', { name: /^compare$/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/select another configuration to compare/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('checkbox', { name: /compare small office database/i }));

    await waitFor(() => {
      expect(screen.getAllByTestId('chart').length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/side by side/i)).toBeInTheDocument();
  });
});

describe('destructive actions', () => {
  it('asks for confirmation before resetting the lifecycle', async () => {
    const user = userEvent.setup();
    renderApp();
    await goToDashboard(user);

    useSimulation.getState().pause();
    useSimulation.getState().advance(MS_PER_DAY * 200);
    expect(useSimulation.getState().bankedMs).toBeGreaterThanOrEqual(MS_PER_DAY * 200);

    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(screen.getByRole('heading', { name: /reset this lifecycle/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset clock/i }));
    await waitFor(() => {
      expect(useSimulation.getState().bankedMs).toBe(0);
      expect(useSimulation.getState().phase).toBe('draft');
    });
  });
});

describe('accessibility of the workspace', () => {
  it('gives every chart a descriptive label', async () => {
    const user = userEvent.setup();
    renderApp();
    await goToDashboard(user);

    await waitFor(() => {
      const charts = screen.getAllByTestId('chart');
      expect(charts.length).toBeGreaterThanOrEqual(4);
      charts.forEach((chart) => {
        expect(chart.textContent?.length ?? 0).toBeGreaterThan(20);
      });
    });
  });

  it('labels the simulation controls', async () => {
    const user = userEvent.setup();
    renderApp();
    await goToDashboard(user);
    expect(within(screen.getByRole('radiogroup', { name: 'Simulation speed' })).getAllByRole('radio')).toHaveLength(5);
  });
});
