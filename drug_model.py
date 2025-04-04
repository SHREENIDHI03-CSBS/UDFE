import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import numpy as np

# Load and merge datasets
dfs = []
for i in range(1, 12):
    try:
        df = pd.read_csv(f'SAMPLE{i}.csv')
        df.columns = df.columns.str.strip()
        dfs.append(df)
    except FileNotFoundError:
        print(f"SAMPLE{i}.csv not found")

df = pd.concat(dfs, ignore_index=True)

# Drop unwanted columns
columns_to_drop = [
    'cid', 'cmpdname', 'cmpdsynonym', 'inchi', 'smiles', 'inchikey', 'iupacname',
    'meshheadings', 'annothits', 'annotation', 'mf', 'aids', 'cidcdate',
    'sidsrcname', 'depcatg'
]

X = df.drop(columns=columns_to_drop, errors='ignore')
target_columns = ['mw', 'polararea']
target_columns = [col for col in target_columns if col in df.columns]
y = df[target_columns].apply(pd.to_numeric, errors='coerce')

# Clean X
numeric_cols = X.select_dtypes(include=['number']).columns
for col in numeric_cols:
    X[col] = pd.to_numeric(X[col], errors='coerce')
    X[col] = X[col].fillna(X[col].mean())
X = X.select_dtypes(include=['number'])

# Remove rows with missing targets
X = X[y.notna().all(axis=1)]
y = y[y.notna().all(axis=1)]

# Split and scale
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
joblib.dump(scaler, 'scaler.pkl')

# PyTorch Dataset
class DrugDataset(Dataset):
    def __init__(self, features, targets):
        self.X = torch.tensor(features, dtype=torch.float32)
        self.y = torch.tensor(targets.values, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

train_dataset = DrugDataset(X_train_scaled, y_train)
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)

# Model
class DrugPredictor(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(DrugPredictor, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, output_dim)
        )

    def forward(self, x):
        return self.net(x)

model = DrugPredictor(X_train.shape[1], len(target_columns))
criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# Training
for epoch in range(100):
    model.train()
    for inputs, targets in train_loader:
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()
    if (epoch+1) % 10 == 0:
        print(f"Epoch {epoch+1}/100 - Loss: {loss.item():.4f}")

# Save model
torch.save(model.state_dict(), "drug_prediction_model.pt")
print("Model saved as drug_prediction_model.pt")

# Prediction
model.eval()
new_data = pd.DataFrame({
    'polararea': [17.1],
    'complexity': [0.0],
    'xlogp': [-0.32],
    'heavycnt': [2],
    'hbonddonor': [1],
    'hbondacc': [1],
    'rotbonds': [0],
    'exactmass': [46.0689],
    'monoisotopicmass': [46.0689],
    'charge': [0],
    'covalentunitcnt': [1]
})
# Ensure all model features are present
for col in X.columns:
    if col not in new_data.columns:
        new_data[col] = 0
new_data = new_data[X.columns]

# Scale and predict
new_data_scaled = scaler.transform(new_data)
new_tensor = torch.tensor(new_data_scaled, dtype=torch.float32)
predicted = model(new_tensor).detach().numpy()[0]

for i, col in enumerate(target_columns):
    print(f"Predicted {col}: {predicted[i]:.2f}")
