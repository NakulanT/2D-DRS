import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# Input 2D coordinates
coordinates_2d = [
    [(763, 904)], [(744, 916)], [(733, 925)], [(722, 935)], [(711, 945)], [(703, 953)], 
    [(694, 960)], [(686, 967)], [(680, 974)], [(673, 981)], [(666, 989)], [(659, 994)], 
    [(655, 1000)], [(649, 1005)], [(645, 1010)], [(641, 1016)], [(636, 1021)], [(632, 1025)], 
    [(627, 1030)], [(624, 1035)], [(621, 1039)], [(617, 1044)], [(613, 1048)], [(610, 1052)], 
    [(607, 1055)], [(605, 1059)], [(603, 1063)], [(600, 1068)], [(598, 1071)], [(595, 1074)], 
    [(594, 1078)], [(591, 1081)], [(589, 1084)], [(586, 1088)], [(585, 1091)], [(583, 1095)], 
    [(581, 1099)], [(579, 1101)], [(577, 1104)], [(575, 1107)], [(574, 1110)], [(572, 1112)], 
    [(572, 1115)], [(570, 1118)], [(568, 1121)], [(567, 1124)], [(565, 1128)], [(564, 1131)], 
    [(563, 1134)], [(561, 1138)], [(560, 1140)], [(559, 1141)], [(559, 1137)], [(559, 1133)], 
    [(557, 1127)], [(556, 1122)], [(556, 1113)], [(555, 1110)], [(554, 1106)], [(554, 1103)], 
    [(553, 1099)], [(553, 1096)], [(553, 1092)]
]

# Extract x and y from the 2D coordinates
x = np.array([coord[0][0] for coord in coordinates_2d])  # X-axis (horizontal)
y = np.array([coord[0][1] for coord in coordinates_2d])  # Y-axis (front-back)

# Calculate distances between consecutive points
distances = np.sqrt(np.diff(x)**2 + np.diff(y)**2)

# Compute cumulative distance (path traveled)
cumulative_distance = np.insert(np.cumsum(distances), 0, 0)  # Add zero for the starting point

# Map cumulative distances to a real-world depth (e.g., 22 yards = 20.12 meters)
real_world_distance = 20.12  # Total distance in meters
z = (cumulative_distance / cumulative_distance[-1]) * real_world_distance  # Z-axis (vertical depth)

# Visualization
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# 3D Trajectory
ax.plot(x, z, y, marker='o', color='green', label='3D Trajectory')

# Cuboid coordinates
x1, y1, x2, y2 = 525, 1063, 549, 1125
z1, z2 = 20, 19

# Vertices of the cuboid
vertices = [
    [x1, z1, y1], [x2, z1, y1], [x2, z1, y2], [x1, z1, y2],  # Bottom face
    [x1, z2, y1], [x2, z2, y1], [x2, z2, y2], [x1, z2, y2],  # Top face
]

# Define the cuboid faces using the vertices
faces = [
    [vertices[0], vertices[1], vertices[2], vertices[3]],  # Bottom face
    [vertices[4], vertices[5], vertices[6], vertices[7]],  # Top face
    [vertices[0], vertices[1], vertices[5], vertices[4]],  # Front face
    [vertices[2], vertices[3], vertices[7], vertices[6]],  # Back face
    [vertices[1], vertices[2], vertices[6], vertices[5]],  # Right face
    [vertices[0], vertices[3], vertices[7], vertices[4]],  # Left face
]

# Add the cuboid to the plot
cuboid = Poly3DCollection(faces, alpha=0.5, edgecolor='k', facecolors='cyan')
ax.add_collection3d(cuboid)

# Set axis labels
ax.set_xlabel("X (pixels, sides)", fontsize=12)
ax.set_ylabel("Z (meters, depth)", fontsize=12)
ax.set_zlabel("Y (pixels, upper)", fontsize=12)

# Adjust the view to look upside-down and parallel
ax.view_init(elev=-90, azim=0)

# Add title and legend
ax.set_title("3D Trajectory with Cuboid", fontsize=14)
ax.legend()

# Show plot
plt.show()
