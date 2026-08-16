import numpy as np
import pandas as pd
from typing import Dict, List
from app.ml.feature_engineering import create_feature_matrix, FEATURE_COLUMNS

class NSETransactionCostModel:
    BROKERAGE   = 0.0003
    STT_SELL    = 0.001
    GST         = 0.18
    SEBI_CHARGE = 0.000001
    STAMP_DUTY  = 0.00015
    
    def total_cost_fraction(self, direction: int) -> float:
        if direction == 1:
            return self.BROKERAGE * (1 + self.GST) + self.STAMP_DUTY + self.SEBI_CHARGE
        elif direction == -1:
            return self.BROKERAGE * (1 + self.GST) + self.STT_SELL + self.SEBI_CHARGE
        return 0.0

class AlmgrenChrissSlippage:
    def __init__(self, eta: float = 0.1):
        self.eta = eta
        
    def slippage(self, vol_ratio: float, daily_vol: float) -> float:
        return self.eta * daily_vol * np.sqrt(abs(vol_ratio))

def calculate_max_drawdown(cum_returns: pd.Series) -> float:
    """Calculate maximum peak-to-trough drawdown percentage."""
    peak = cum_returns.cummax()
    drawdown = (cum_returns - peak) / peak
    max_dd = drawdown.min()
    return round(abs(float(max_dd)) * 100, 2) if not pd.isna(max_dd) else 0.0

def run_backtest_simulation(df: pd.DataFrame, model_predictor=None, apply_costs=True) -> Dict:
    """
    Simulates model-driven trading strategy performance against Buy-and-Hold baseline.
    """
    matrix = create_feature_matrix(df)
    if matrix.empty or len(matrix) < 40:
        return {"status": "error", "message": "Insufficient data for backtesting"}

    df_bt = matrix.copy().sort_values("date")
    daily_returns = df_bt["close"].pct_change().fillna(0.0)

    # Generate signals: if model provided, predict; else fallback to technical signal rule
    signals = []
    if model_predictor and hasattr(model_predictor, "model") and model_predictor.is_trained:
        if hasattr(model_predictor, 'oof_predictions') and model_predictor.oof_predictions is not None and len(model_predictor.oof_predictions) > 0:
            # Use out-of-fold predictions (honest, out-of-sample)
            oof = model_predictor.oof_predictions
            df_bt = df_bt.loc[df_bt.index.isin(oof.index)].copy()
            signals = oof.reindex(df_bt.index).values
            daily_returns = daily_returns.reindex(df_bt.index)
        else:
            X = df_bt[FEATURE_COLUMNS]
            preds = model_predictor.model.predict(X)
            signals = list(preds)
    else:
        # Simple signal rule: 1 if ret_1d > 0 and rsi < 65 else -1 or 0
        for idx, row in df_bt.iterrows():
            if row["rsi_14"] < 35 or (row["macd_hist"] > 0 and row["rsi_14"] < 55):
                signals.append(1)
            elif row["rsi_14"] > 65 or row["macd_hist"] < 0:
                signals.append(-1)
            else:
                signals.append(0)

    df_bt["signal"] = signals
    # Position shifted by 1 day to prevent lookahead execution
    df_bt["position"] = df_bt["signal"].shift(1).fillna(0)
    
    # Calculate costs
    df_bt["daily_vol"] = daily_returns.rolling(20).std().fillna(0.0)
    df_bt["pos_change"] = df_bt["position"].diff().fillna(df_bt["position"])
    
    cost_model = NSETransactionCostModel()
    slippage_model = AlmgrenChrissSlippage(eta=0.1)
    
    costs = []
    total_trades = 0
    for idx, row in df_bt.iterrows():
        change = row["pos_change"]
        if change != 0:
            total_trades += 1
        if apply_costs and change != 0:
            direction = 1 if change > 0 else -1
            c_frac = cost_model.total_cost_fraction(direction)
            slip = slippage_model.slippage(row.get("vol_ratio", 1.0), row.get("daily_vol", 0.0))
            cost = (c_frac + slip) * abs(change)
            costs.append(cost)
        else:
            costs.append(0.0)
            
    df_bt["trade_cost"] = costs

    # Strategy daily return: position * daily market return
    strategy_returns = df_bt["position"] * daily_returns
    net_strategy_returns = strategy_returns - df_bt["trade_cost"]
    benchmark_returns = daily_returns

    # Cumulative returns (base 1.0)
    cum_strategy = (1.0 + strategy_returns).cumprod()
    cum_net_strategy = (1.0 + net_strategy_returns).cumprod()
    cum_benchmark = (1.0 + benchmark_returns).cumprod()

    # Metrics
    strat_total_return = round((float(cum_strategy.iloc[-1]) - 1.0) * 100, 2)
    strat_net_return = round((float(cum_net_strategy.iloc[-1]) - 1.0) * 100, 2)
    bench_total_return = round((float(cum_benchmark.iloc[-1]) - 1.0) * 100, 2)

    strat_sharpe = 0.0
    if strategy_returns.std() > 0:
        strat_sharpe = round(float((strategy_returns.mean() / strategy_returns.std()) * np.sqrt(252)), 2)

    bench_sharpe = 0.0
    if benchmark_returns.std() > 0:
        bench_sharpe = round(float((benchmark_returns.mean() / benchmark_returns.std()) * np.sqrt(252)), 2)

    max_dd_strat = calculate_max_drawdown(cum_strategy)
    max_dd_bench = calculate_max_drawdown(cum_benchmark)
    
    # New metrics
    days = max(1, len(df_bt))
    ann_return = (cum_net_strategy.iloc[-1] ** (252 / days)) - 1.0
    calmar = ann_return / (max_dd_strat / 100) if max_dd_strat > 0 else 0.0
    
    downside_returns = net_strategy_returns[net_strategy_returns < 0]
    down_dev = downside_returns.std()
    sortino = (net_strategy_returns.mean() / down_dev * np.sqrt(252)) if down_dev > 0 else 0.0
    
    total_cost_pct = strat_total_return - strat_net_return
    
    # Formatted equity curve for charts
    equity_curve = []
    for idx, row in df_bt.iterrows():
        equity_curve.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "strategy": round(float(cum_strategy.loc[idx]), 4),
            "benchmark": round(float(cum_benchmark.loc[idx]), 4)
        })

    return {
        "status": "success",
        "symbol": df_bt["symbol"].iloc[0] if "symbol" in df_bt.columns else "STOCK",
        "total_candles": len(df_bt),
        "strategy_return_pct": strat_total_return,
        "benchmark_return_pct": bench_total_return,
        "strategy_sharpe": strat_sharpe,
        "benchmark_sharpe": bench_sharpe,
        "max_drawdown_pct": max_dd_strat,
        "benchmark_max_drawdown_pct": max_dd_bench,
        "cost_adjusted_return_pct": strat_net_return,
        "total_trades": total_trades,
        "total_cost_pct": total_cost_pct,
        "cost_drag_vs_gross": total_cost_pct,
        "calmar_ratio": float(calmar),
        "sortino_ratio": float(sortino),
        "equity_curve": equity_curve[-60:] # last 60 candles for visual chart
    }

