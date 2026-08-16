import sys, json, sqlite3
import pandas as pd
import numpy as np
from datetime import date
sys.path.insert(0, '.')
from app.ml.feature_engineering import create_feature_matrix, FEATURE_COLUMNS
from app.ml.validation import WalkForwardSplitter
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import f1_score
from sklearn.dummy import DummyClassifier

def load_stock_df(symbol):
    conn = sqlite3.connect('data/stock_analyst.db')
    df = pd.read_sql_query(
        "SELECT date, open, high, low, close, volume FROM price_histories WHERE symbol=? ORDER BY date",
        conn, params=(symbol,)
    )
    conn.close()
    df['date'] = pd.to_datetime(df['date'])
    return df

def main():
    symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"]
    
    results = {
        "A_majority_baseline": {},
        "B_random": {},
        "C_flat_mlp": {},
        "D_rf_no_regime": {},
        "E_rf_no_sentiment": {},
        "F_full_rf_17features": {}
    }
    
    splitter = WalkForwardSplitter(min_train_size=120, test_size=30, n_splits=5, embargo_horizon=3)
    
    for symbol in symbols:
        print(f"Processing {symbol}...")
        df = load_stock_df(symbol)
        df_feat = create_feature_matrix(df)
        df_feat.dropna(inplace=True)
        
        # Target column setup if not present from create_feature_matrix
        if 'target_class' in df_feat.columns:
            target_col = 'target_class'
        elif 'target' in df_feat.columns:
            target_col = 'target'
        else:
            print("No target column found")
            return
            
        X = df_feat[FEATURE_COLUMNS].values
        y = df_feat[target_col].values
        
        # Subsets of features
        X_14 = df_feat[FEATURE_COLUMNS[:-3]].values
        X_16 = df_feat[FEATURE_COLUMNS[:-1]].values
        X_17 = df_feat[FEATURE_COLUMNS].values
        
        splits = list(splitter.split(df_feat))
        
        f1_scores = {k: [] for k in results.keys()}
        
        for train_idx, test_idx in splits:
            y_train, y_test = y[train_idx], y[test_idx]
            
            # A_majority_baseline
            dummy_maj = DummyClassifier(strategy='most_frequent')
            dummy_maj.fit(X_17[train_idx], y_train)
            f1_scores['A_majority_baseline'].append(f1_score(y_test, dummy_maj.predict(X_17[test_idx]), average='macro', zero_division=0))
            
            # B_random
            dummy_rnd = DummyClassifier(strategy='uniform', random_state=42)
            dummy_rnd.fit(X_17[train_idx], y_train)
            f1_scores['B_random'].append(f1_score(y_test, dummy_rnd.predict(X_17[test_idx]), average='macro', zero_division=0))
            
            # C_flat_mlp
            mlp = MLPClassifier(hidden_layer_sizes=(128,64), max_iter=300, random_state=42)
            mlp.fit(X_14[train_idx], y_train)
            f1_scores['C_flat_mlp'].append(f1_score(y_test, mlp.predict(X_14[test_idx]), average='macro', zero_division=0))
            
            # D_rf_no_regime
            rf_d = RandomForestClassifier(n_estimators=100, random_state=42)
            rf_d.fit(X_14[train_idx], y_train)
            f1_scores['D_rf_no_regime'].append(f1_score(y_test, rf_d.predict(X_14[test_idx]), average='macro', zero_division=0))
            
            # E_rf_no_sentiment
            rf_e = RandomForestClassifier(n_estimators=100, random_state=42)
            rf_e.fit(X_16[train_idx], y_train)
            f1_scores['E_rf_no_sentiment'].append(f1_score(y_test, rf_e.predict(X_16[test_idx]), average='macro', zero_division=0))
            
            # F_full_rf_17features
            rf_f = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
            rf_f.fit(X_17[train_idx], y_train)
            f1_scores['F_full_rf_17features'].append(f1_score(y_test, rf_f.predict(X_17[test_idx]), average='macro', zero_division=0))
            
        for k in results.keys():
            results[k][symbol] = float(np.mean(f1_scores[k]))
            
    mean_f1 = {k: float(np.mean(list(results[k].values()))) for k in results.keys()}
    
    imp_regime = (mean_f1["F_full_rf_17features"] - mean_f1["D_rf_no_regime"]) / mean_f1["D_rf_no_regime"] * 100 if mean_f1["D_rf_no_regime"] > 0 else 0
    imp_sentiment = (mean_f1["F_full_rf_17features"] - mean_f1["E_rf_no_sentiment"]) / mean_f1["E_rf_no_sentiment"] * 100 if mean_f1["E_rf_no_sentiment"] > 0 else 0
    imp_mlp = (mean_f1["F_full_rf_17features"] - mean_f1["C_flat_mlp"]) / mean_f1["C_flat_mlp"] * 100 if mean_f1["C_flat_mlp"] > 0 else 0
    
    final_output = {
        "experiment_date": str(date.today()),
        "stocks_tested": symbols,
        "configs": results,
        "mean_f1": mean_f1,
        "improvement_from_regime_features": f"{imp_regime:.2f}%",
        "improvement_from_sentiment": f"{imp_sentiment:.2f}%",
        "improvement_over_mlp": f"{imp_mlp:.2f}%"
    }
    
    with open('data/ablation_results.json', 'w') as f:
        json.dump(final_output, f, indent=2)
        
    print("Ablation complete. Results saved to data/ablation_results.json")
    print(json.dumps(final_output, indent=2))

if __name__ == "__main__":
    main()
