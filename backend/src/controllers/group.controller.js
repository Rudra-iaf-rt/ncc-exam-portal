const { prisma } = require("../lib/prisma");
const { z } = require("zod");
const { HttpError } = require("../utils/http-error");
const { logger } = require("../utils/logger");

const groupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  memberIds: z.array(z.number()).optional().default([]),
  collegeCodes: z.array(z.string()).optional().default([])
});

async function listGroups(req, res) {
  try {
    const { cacheGetJson, cacheSetJson } = require("../lib/cache");
    const cacheKey = "cache:groups:list";
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
      return res.json({ groups: cached });
    }

    const groups = await prisma.candidateGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { colleges: true }
        },
        colleges: { select: { collegeCode: true } },
        members: { select: { userId: true } },
        createdBy: {
          select: { name: true }
        }
      }
    });

    const mappedGroups = await Promise.all(groups.map(async (g) => {
      const collegeCodes = g.colleges.map(c => c.collegeCode);
      const userIds = g.members.map(m => m.userId);
      
      let actualCadetCount = 0;
      if (collegeCodes.length > 0 || userIds.length > 0) {
        actualCadetCount = await prisma.user.count({
          where: {
            role: "STUDENT",
            isActive: true,
            OR: [
              ...(collegeCodes.length > 0 ? [{ collegeCode: { in: collegeCodes } }] : []),
              ...(userIds.length > 0 ? [{ id: { in: userIds } }] : [])
            ]
          }
        });
      }

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        isActive: g.isActive,
        createdAt: g.createdAt,
        createdBy: g.createdBy,
        memberCount: actualCadetCount,
        collegeCount: g._count.colleges
      };
    }));

    await cacheSetJson(cacheKey, 60, mappedGroups);

    res.json({
      groups: mappedGroups
    });
  } catch (error) {
    logger.error({ action: 'list_groups', error: error.message });
    res.status(500).json({ error: error.message || "Failed to list groups" });
  }
}

async function getGroup(req, res) {
  try {
    const id = parseInt(req.params.id);
    const group = await prisma.candidateGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, regimentalNumber: true, collegeCode: true, wing: true, batch: true } }
          }
        },
        colleges: {
          include: {
            college: { select: { code: true, name: true } }
          }
        }
      }
    });

    if (!group) throw new HttpError(404, "Group not found");
    res.json(group);
  } catch (error) {
    logger.error({ action: 'get_group', error: error.message });
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to get group" });
  }
}

async function createGroup(req, res) {
  try {
    const data = groupSchema.parse(req.body);
    
    const existing = await prisma.candidateGroup.findUnique({ where: { name: data.name } });
    if (existing) throw new HttpError(400, "Group with this name already exists");

    const group = await prisma.candidateGroup.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        createdById: req.user.id,
        members: {
          createMany: {
            data: data.memberIds.map(userId => ({ userId }))
          }
        },
        colleges: {
          createMany: {
            data: data.collegeCodes.map(collegeCode => ({ collegeCode }))
          }
        }
      }
    });

    const { cacheDel } = require("../lib/cache");
    await cacheDel(["cache:groups:list"]);

    res.status(201).json(group);
  } catch (error) {
    logger.error({ action: 'create_group', error: error.message });
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to create group" });
  }
}

async function updateGroup(req, res) {
  try {
    const id = parseInt(req.params.id);
    const data = groupSchema.parse(req.body);

    const existing = await prisma.candidateGroup.findFirst({ where: { name: data.name, id: { not: id } } });
    if (existing) throw new HttpError(400, "Another group with this name already exists");

    const group = await prisma.candidateGroup.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        members: {
          deleteMany: {},
          createMany: {
            data: data.memberIds.map(userId => ({ userId }))
          }
        },
        colleges: {
          deleteMany: {},
          createMany: {
            data: data.collegeCodes.map(collegeCode => ({ collegeCode }))
          }
        }
      }
    });

    const { cacheDel } = require("../lib/cache");
    await cacheDel(["cache:groups:list"]);

    res.json(group);
  } catch (error) {
    logger.error({ action: 'update_group', error: error.message });
    const status = error.status || 500;
    res.status(status).json({ error: error.message || "Failed to update group" });
  }
}

async function deleteGroup(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    await prisma.candidateGroup.delete({
      where: { id }
    });

    const { cacheDel } = require("../lib/cache");
    await cacheDel(["cache:groups:list"]);

    res.status(204).end();
  } catch (error) {
    logger.error({ action: 'delete_group', error: error.message });
    res.status(500).json({ error: "Failed to delete group" });
  }
}

module.exports = {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup
};
