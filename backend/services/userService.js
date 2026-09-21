import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";


// UPDATE
export const updateUser = async (userId, updateData) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
if (updateData.password && updateData.password.trim() !== "") {
  const saltRounds = 12;
  updateData.password = await bcrypt.hash(updateData.password, saltRounds);
} else {
  delete updateData.password; 
}
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

//DELETE

export const deleteUser = async (userId) => {

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return true;
};

