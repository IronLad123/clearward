# Ablation Experiment Results

**Date:** 2026-08-15
**Note:** For education only. Not investment advice.

## Configuration Mean F1 Scores

| Configuration | RELIANCE.NS | TCS.NS | HDFCBANK.NS | INFY.NS | ICICIBANK.NS | Mean F1 |
|---------------|-------------|--------|-------------|---------|--------------|---------|
| A: Majority Baseline | 0.166 | 0.192 | 0.141 | 0.083 | 0.135 | 0.143 |
| B: Random Classifier | 0.358 | 0.293 | 0.313 | 0.211 | 0.284 | 0.292 |
| C: Flat MLP | 0.335 | 0.196 | 0.221 | 0.206 | 0.336 | 0.259 |
| D: RF (No Regime) | 0.313 | 0.282 | 0.268 | 0.158 | 0.290 | 0.262 |
| E: RF (No Sentiment) | 0.332 | 0.266 | 0.247 | 0.158 | 0.297 | 0.260 |
| F: Full RF (17 features) | 0.295 | 0.259 | 0.237 | 0.154 | 0.313 | 0.251 |

## Improvements

- Adding HMM regime features improved mean F1 by -4.07% over RF-no-regime.
- Adding sentiment features improved mean F1 by -3.35% over RF-no-sentiment.
- Full RF (17 features) outperforms flat MLP by -2.86%.

## Key Findings

- **Baseline Performance:** The random classifier outperformed all other models, indicating a highly challenging prediction task with a weak signal-to-noise ratio.
- **Model Complexity:** The Flat MLP and RF variants performed similarly but underperformed the random baseline, suggesting overfitting on the training data.
- **Feature Impact:** The addition of HMM regime features and sentiment features slightly degraded performance in this walk-forward validation setup, suggesting these features might be noisy or require further engineering.
- **Overall Signal:** The models struggle to consistently beat simple random baselines on out-of-fold data, highlighting the difficulty of financial time series forecasting.
