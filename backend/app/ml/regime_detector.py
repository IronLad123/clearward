import numpy as np
import pandas as pd
from scipy.stats import norm

class MarketRegimeDetector:
    """
    HMM-based market regime detector using Gaussian emissions.
    
    Research basis: 
    - Hamilton (1989) 'A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle'
    - Ang & Timmermann (2012) 'Regime Changes and Financial Markets'
    
    Identifies latent regimes (bull vs bear markets) from return sequences.
    """
    def __init__(self, n_states=2, max_iter=100, tol=1e-4):
        self.n_states = n_states
        self.max_iter = max_iter
        self.tol = tol
        self.means = None
        self.vars = None
        self.trans_mat = None
        self.init_prob = None
        self.is_fitted = False

    def fit(self, returns: np.ndarray) -> 'MarketRegimeDetector':
        n = len(returns)
        returns = np.nan_to_num(returns)
        
        sorted_ret = np.sort(returns)
        self.means = np.array([np.mean(returns[returns > np.median(returns)]), 
                               np.mean(returns[returns <= np.median(returns)])])
        if self.n_states > 2:
            self.means = np.linspace(np.min(returns), np.max(returns), self.n_states)
            
        self.vars = np.ones(self.n_states) * np.var(returns)
        self.trans_mat = np.ones((self.n_states, self.n_states)) / self.n_states
        self.init_prob = np.ones(self.n_states) / self.n_states
        
        log_likelihood_old = -np.inf
        
        for iteration in range(self.max_iter):
            # E-step
            emissions = np.zeros((n, self.n_states))
            for j in range(self.n_states):
                emissions[:, j] = norm.pdf(returns, loc=self.means[j], scale=np.sqrt(self.vars[j]) + 1e-6)
            emissions = np.maximum(emissions, 1e-12)
            
            alpha = np.zeros((n, self.n_states))
            c = np.zeros(n)
            
            alpha[0] = self.init_prob * emissions[0]
            c[0] = np.sum(alpha[0])
            alpha[0] = alpha[0] / c[0]
            
            for t in range(1, n):
                alpha[t] = emissions[t] * (alpha[t-1] @ self.trans_mat)
                c[t] = np.sum(alpha[t])
                alpha[t] = alpha[t] / c[t]
            
            beta = np.zeros((n, self.n_states))
            beta[n-1] = 1.0
            for t in range(n-2, -1, -1):
                beta[t] = (self.trans_mat @ (emissions[t+1] * beta[t+1])) / c[t+1]
                
            gamma = alpha * beta
            gamma = gamma / np.sum(gamma, axis=1, keepdims=True)
            
            xi = np.zeros((n-1, self.n_states, self.n_states))
            for t in range(n-1):
                xi[t] = (self.trans_mat * np.outer(alpha[t], emissions[t+1] * beta[t+1])) / c[t+1]
                
            # M-step
            gamma_sum = np.sum(gamma, axis=0)
            self.init_prob = gamma[0]
            self.trans_mat = np.sum(xi, axis=0) / np.sum(gamma[:-1], axis=0)[:, np.newaxis]
            self.means = np.sum(gamma * returns[:, np.newaxis], axis=0) / gamma_sum
            
            for j in range(self.n_states):
                diff = returns - self.means[j]
                self.vars[j] = np.sum(gamma[:, j] * (diff ** 2)) / gamma_sum[j]
            
            log_likelihood = np.sum(np.log(c))
            if np.abs(log_likelihood - log_likelihood_old) < self.tol:
                break
            log_likelihood_old = log_likelihood
            
        # Ensure State 1 is Bear (lower mean), State 0 is Bull (higher mean)
        if self.means[0] < self.means[1]:
            self.means = self.means[::-1]
            self.vars = self.vars[::-1]
            self.init_prob = self.init_prob[::-1]
            self.trans_mat = self.trans_mat[::-1, ::-1]
            
        self.is_fitted = True
        return self

    def predict_proba(self, returns: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict_proba")
            
        n = len(returns)
        returns = np.nan_to_num(returns)
        emissions = np.zeros((n, self.n_states))
        for j in range(self.n_states):
            emissions[:, j] = norm.pdf(returns, loc=self.means[j], scale=np.sqrt(self.vars[j]) + 1e-6)
        emissions = np.maximum(emissions, 1e-12)
        
        alpha = np.zeros((n, self.n_states))
        c = np.zeros(n)
        
        alpha[0] = self.init_prob * emissions[0]
        c[0] = np.sum(alpha[0])
        alpha[0] = alpha[0] / c[0]
        
        for t in range(1, n):
            alpha[t] = emissions[t] * (alpha[t-1] @ self.trans_mat)
            c[t] = np.sum(alpha[t])
            alpha[t] = alpha[t] / c[t]
            
        return alpha

    def predict(self, returns: np.ndarray) -> np.ndarray:
        probas = self.predict_proba(returns)
        return np.argmax(probas, axis=1)

    def add_regime_feature(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        if len(df) < 50:
            df['regime_state'] = 0
            df['regime_prob_bear'] = 0.0
            return df
            
        returns = df['close'].pct_change().fillna(0).values
        if not self.is_fitted:
            self.fit(returns)
            
        states = self.predict(returns)
        probas = self.predict_proba(returns)
        
        df['regime_state'] = states
        df['regime_prob_bear'] = probas[:, 1]
        return df

if __name__ == '__main__':
    np.random.seed(42)
    bull_returns = np.random.normal(0.001, 0.01, 200)
    bear_returns = np.random.normal(-0.002, 0.03, 100)
    returns = np.concatenate([bull_returns, bear_returns, bull_returns])
    
    model = MarketRegimeDetector(n_states=2)
    model.fit(returns)
    states = model.predict(returns)
    probas = model.predict_proba(returns)
    print("Means:", model.means)
    print("Variances:", model.vars)
    print("States:", np.bincount(states))
