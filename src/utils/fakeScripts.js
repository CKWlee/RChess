
export const SCRIPT_CONTENT = `# ============================================================
# Correlation Analysis: Experimental Variables
# Author: Jason Varghese
# Date: 2026-02-25
# Description: Analyzing correlations between key process
#              variables from Lab Experiment #47
# ============================================================

# Load required packages
library(corrplot)
library(ggplot2)
library(dplyr)

# Set random seed for reproducibility
set.seed(42)

# Generate experimental dataset
n_obs <- 200

experiment_df <- data.frame(
  temp       = rnorm(n_obs, mean = 72.5, sd = 4.2),
  pressure   = rnorm(n_obs, mean = 14.7, sd = 1.8),
  humidity   = rnorm(n_obs, mean = 45.0, sd = 8.3),
  pH         = rnorm(n_obs, mean = 7.02, sd = 0.35),
  viscosity  = rnorm(n_obs, mean = 1.05, sd = 0.12),
  density    = rnorm(n_obs, mean = 0.998, sd = 0.003),
  flow_rate  = rnorm(n_obs, mean = 2.34, sd = 0.45),
  yield      = rnorm(n_obs, mean = 88.2, sd = 5.7)
)

# Introduce correlations (temp → yield, pressure → flow_rate)
experiment_df$yield <- experiment_df$yield +
  0.6 * experiment_df$temp - 0.3 * experiment_df$pressure

experiment_df$flow_rate <- experiment_df$flow_rate +
  0.4 * experiment_df$pressure - 0.2 * experiment_df$humidity

# Compute correlation matrix
correlation_matrix <- cor(experiment_df)
correlation_matrix <- round(correlation_matrix, 2)

# Print correlation matrix
print(correlation_matrix)

# Significance testing
p_value <- cor.test(experiment_df$temp, experiment_df$yield)$p.value
cat("p-value (temp ~ yield):", p_value, "\\n")

# Visualize
corrplot(correlation_matrix,
         method  = "color",
         type    = "full",
         order   = "original",
         tl.col  = "black",
         tl.srt  = 45,
         addCoef.col = "black",
         number.cex  = 0.7,
         col = colorRampPalette(c("#2166AC", "#F7F7F7", "#B2182B"))(200))

# Summary statistics
cat("\\n--- Summary Statistics ---\\n")
cat("Observations:", n_obs, "\\n")
cat("Variables:", ncol(experiment_df), "\\n")
cat("Strongest correlation:", max(abs(correlation_matrix[
  correlation_matrix < 1])), "\\n")`;

export const DATA_CLEANING_CONTENT = `# ============================================================
# Data Cleaning Pipeline
# Author: Jason Varghese
# Date: 2026-02-20
# ============================================================

library(dplyr)
library(tidyr)
library(stringr)

# Load raw data
raw_data <- read.csv("data/experiment_raw.csv")

# Check for missing values
cat("Missing values per column:\\n")
colSums(is.na(raw_data))

# Remove rows with NA in critical columns
clean_data <- raw_data %>%
  filter(!is.na(temp), !is.na(yield)) %>%
  mutate(
    temp = round(temp, 2),
    pressure = round(pressure, 2),
    pH = round(pH, 3)
  )

# Remove outliers (> 3 SD from mean)
remove_outliers <- function(df, col) {
  mu <- mean(df[[col]], na.rm = TRUE)
  sigma <- sd(df[[col]], na.rm = TRUE)
  df %>% filter(abs(.data[[col]] - mu) <= 3 * sigma)
}

for (col in c("temp", "pressure", "humidity", "yield")) {
  clean_data <- remove_outliers(clean_data, col)
}

cat("\\nRows after cleaning:", nrow(clean_data), "\\n")
cat("Rows removed:", nrow(raw_data) - nrow(clean_data), "\\n")

# Save cleaned dataset
write.csv(clean_data, "data/experiment_clean.csv", row.names = FALSE)
cat("Cleaned data saved to data/experiment_clean.csv\\n")`;

export const BOSS_DATA_CLEANING = `# ============================================================
# Model Diagnostics and Validation
# Author: Jason Varghese
# ============================================================

library(ggplot2)

# Residual analysis
residuals <- resid(model)
fitted_values <- fitted(model)

# Normal Q-Q plot
qqnorm(residuals)
qqline(residuals, col = "red")

# Shapiro-Wilk test for normality
shapiro.test(residuals)

# Breusch-Pagan test for heteroscedasticity
library(lmtest)
bptest(model)

# Variance Inflation Factor
library(car)
vif(model)

# Cook's distance
cooksd <- cooks.distance(model)
plot(cooksd, type = "h", main = "Cook's Distance")
abline(h = 4/nrow(mtcars), col = "red")
cat("Influential observations:", sum(cooksd > 4/nrow(mtcars)), "\\n")`;

export const BOSS_SCRIPT = `# ============================================================
# Linear Regression: Fuel Economy Analysis
# Author: Jason Varghese
# Date: 2026-02-28
# Description: Modeling MPG from vehicle characteristics
# ============================================================

library(ggplot2)

# Load built-in dataset
data(mtcars)

# Fit linear model
model <- lm(mpg ~ wt + hp + disp, data = mtcars)

# Model summary
summary(model)

# Diagnostic plots
par(mfrow = c(2, 2))
plot(model)

# Prediction
new_car <- data.frame(wt = 3.2, hp = 150, disp = 275)
predicted_mpg <- predict(model, newdata = new_car)
cat("Predicted MPG:", predicted_mpg, "\\n")

# Scatter plot with regression line
ggplot(mtcars, aes(x = wt, y = mpg)) +
  geom_point(alpha = 0.7) +
  geom_smooth(method = "lm", se = TRUE, color = "steelblue") +
  labs(title = "MPG vs Weight",
       x = "Weight (1000 lbs)",
       y = "Miles per Gallon") +
  theme_minimal()`;
