import type { User } from '@prisma/pg'
import { Prisma } from '@prisma/pg'
import { Request } from 'express'

import { Auth, Controller, Delete, Get, Patch, Post } from '@/decorators'
import type {
  OmitPassword,
  PageUserModel,
  UserChangePasswordModel,
  UserCreateInputModel,
  UserPageRequestModel,
  UserResetPasswordModel,
  UserUpdateModel
} from '@/models'
import { UserCreateResponse } from '@/models'
import { UsersService } from '@/services'
import { BasePageResponse, BaseResponse } from '@/types'
import { passwordEquals, passwordHash } from '@/utils'

@Controller('/users')
@Auth()
class UsersController {
  /**
   * 用户列表
   */
  @Get('/')
  async getUsers(request: Request, response: BasePageResponse<PageUserModel[]>) {
    const { t, lang } = request
    const { page, pageSize, searchText, startDate, endDate, sort, order, authTypes } = request.query

    if (!page || !pageSize) {
      response.status(400).json({
        message: t('Page.Require')
      })
      return
    }

    if (typeof Number(page) !== 'number' || typeof Number(pageSize) !== 'number') {
      response.status(400).json({
        message: t('Page.Invalid')
      })
      return
    }

    const pageModel: UserPageRequestModel = {
      page: Number(page),
      pageSize: Number(pageSize),
      searchText: searchText?.toString(),
      startDate: startDate?.toString() ? new Date(startDate.toString()) : undefined,
      endDate: endDate?.toString() ? new Date(endDate.toString()) : undefined,
      sort: typeof sort === 'string' ? sort : undefined,
      order: typeof order === 'string' ? order : undefined,
      authTypes: authTypes?.toString()
    }

    const { users, ...pageResult } = await UsersService.getUsers(pageModel, { t, lang })

    response.status(200).json({
      data: users,
      ...pageResult
    })
  }

  /**
   * 用户信息
   */
  @Get('/:id(\\d+)')
  async getUserById(request: Request, response: BaseResponse<OmitPassword<User>>) {
    const { t } = request
    const id = parseInt(request.params.id, 10)

    const user = await UsersService.getUserById(id)
    if (user) {
      response.status(200).json({
        data: UsersService.filterSafeUserInfo(user)
      })
    } else {
      response.status(404).json({
        message: t('User.NotExist')
      })
    }
  }

  /**
   * 当前用户
   */
  @Get('/info')
  async getCurrentUser(request: Request, response: BaseResponse<OmitPassword<User>>) {
    const { t } = request
    if (!request.currentUser) {
      response.status(401).json({
        message: t('User.NotExist')
      })
      return
    }

    response.status(200).json({
      data: UsersService.filterSafeUserInfo(request.currentUser)
    })
  }

  /**
   * 创建用户
   */
  @Post('/')
  async createUser(request: Request, response: UserCreateResponse) {
    const { t, currentUser } = request
    const { username, password } = request.body as UserCreateInputModel

    if (!username?.trim()) {
      response.status(400).json({
        message: t('Username.Require')
      })
      return
    }

    if (!password?.trim()) {
      response.status(400).json({
        message: t('Password.Require')
      })
      return
    }

    if (username.trim().length < 4) {
      response.status(400).json({
        message: t('Username.MaxLength')
      })
      return
    }

    if (password.trim().length < 6) {
      response.status(400).json({
        message: t('Password.MaxLength')
      })
      return
    }

    // Check if username already exists
    if ((await UsersService.alreadyExists(username)).isExist) {
      response.status(409).json({
        message: t('Username.AlreadyExist')
      })
      return
    }

    try {
      const user = await UsersService.createUser(
        {
          username,
          password: await passwordHash(password)
        },
        { currentUser }
      )

      response.status(201).json({
        data: user,
        message: t('User.Created')
      })
    } catch (error) {
      console.log(error)
      response.status(500).json({
        message: t('User.CreateFailed')
      })
    }
  }

  /**
   * 修改用户
   */
  @Patch('/:id(\\d+)')
  async updateUser(request: Request, response: BaseResponse<OmitPassword<User>>) {
    const { t, currentUser } = request
    const userUpdateModel = request.body as UserUpdateModel
    const id = parseInt(request.params.id, 10)

    if (!id) {
      response.status(400).json({
        message: t('User.ID.Require')
      })
      return
    }

    try {
      const originalUser = await UsersService.getUserById(id)
      if (!originalUser) {
        response.status(404).json({
          message: t('User.NotExist')
        })
        return
      }

      const updateUser: UserUpdateModel = {
        ...originalUser,
        email: userUpdateModel.email ?? originalUser.email,
        phoneNumber: userUpdateModel.phoneNumber ?? originalUser.phoneNumber,
        name: userUpdateModel.name ?? originalUser.name,
        firstName: userUpdateModel.firstName ?? originalUser.firstName,
        lastName: userUpdateModel.lastName ?? originalUser.lastName,
        nickName: userUpdateModel.nickName ?? originalUser.nickName,
        avatarUrl: userUpdateModel.avatarUrl ?? originalUser.avatarUrl,
        gender: userUpdateModel.gender ?? originalUser.gender,
        country: userUpdateModel.country ?? originalUser.country,
        province: userUpdateModel.province ?? originalUser.province,
        city: userUpdateModel.city ?? originalUser.city,
        address: userUpdateModel.address ?? originalUser.address,
        biography: userUpdateModel.biography ?? originalUser.biography,
        birthDate: userUpdateModel.birthDate ?? originalUser.birthDate,
        verified: userUpdateModel.verified ?? originalUser.verified,
        enabled: userUpdateModel.enabled ?? originalUser.enabled
      }

      const user = await UsersService.updateUser(id, updateUser, { currentUser })
      if (!user) {
        response.status(404).json({
          message: t('User.NotExist')
        })
        return
      }

      response.status(200).json({
        data: UsersService.filterSafeUserInfo(user),
        message: t('User.Updated')
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // 处理唯一索引冲突
        if (error.code === 'P2002') {
          const { target } = error.meta || {}

          let errorMessage = ''
          if ((target as string[]).includes('username')) {
            errorMessage = t('User.Username.Unique')
          } else if ((target as string[]).includes('email')) {
            errorMessage = t('User.Email.Unique')
          }

          response.status(409).json({
            message: errorMessage
          })
        } else if (error.code === 'P2025') {
          // 未找到用户信息
          response.status(404).json({
            message: t('User.NotExist')
          })
        }
        return
      }
      console.log(error)
      response.status(500).json({
        message: t('User.UpdateFailed')
      })
    }
  }

  /**
   * 删除用户
   */
  @Delete('/:id(\\d+)')
  async deleteUser(request: Request, response: BaseResponse) {
    const { t, currentUser } = request
    const id = parseInt(request.params.id, 10)
    if (!id) {
      response.status(400).json({
        message: t('User.ID.Require')
      })
      return
    }

    try {
      const user = await UsersService.deleteUser(id, { currentUser })
      if (!user) {
        response.status(404).json({
          message: t('User.NotExist')
        })
        return
      }

      response.status(200).json({
        message: t('User.Deleted')
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          response.status(404).json({
            message: t('User.NotExist')
          })
        }
        return
      }
      console.log(error)
      response.status(500).json({
        message: t('User.DeleteFailed')
      })
    }
  }

  /**
   * 启用用户
   */
  @Post('/:id(\\d+)/activate')
  async activateUser(request: Request, response: BaseResponse) {
    const { t, currentUser } = request
    const id = parseInt(request.params.id, 10)

    if (!id) {
      response.status(400).json({
        message: t('User.ID.Require')
      })
      return
    }

    if (id === currentUser?.id) {
      response.status(400).json({
        message: t('User.CanNotProcessCurrentUser')
      })
      return
    }

    try {
      const user = await UsersService.activateUser(id, { currentUser })
      if (!user) {
        response.status(404).json({
          message: t('User.NotExist')
        })
      }

      response.status(200).json({
        message: t('User.Activated')
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          response.status(404).json({
            message: t('User.NotExist')
          })
        }
        return
      }
      console.log(error)
      response.status(500).json({
        message: t('User.ActivatedFailed')
      })
    }
  }

  /**
   * 禁用用户
   */
  @Post('/:id(\\d+)/deactivate')
  async deactivateUser(request: Request, response: BaseResponse) {
    const { t, currentUser } = request
    const id = parseInt(request.params.id, 10)

    if (!id) {
      response.status(400).json({
        message: t('User.ID.Require')
      })
      return
    }

    if (id === currentUser?.id) {
      response.status(400).json({
        message: t('User.CanNotProcessCurrentUser')
      })
      return
    }

    try {
      const user = await UsersService.deactivateUser(id, { currentUser })
      if (!user) {
        response.status(404).json({
          message: t('User.NotExist')
        })
      }

      response.status(200).json({
        message: t('User.Deactivated')
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          response.status(404).json({
            message: t('User.NotExist')
          })
        }
        return
      }
      console.log(error)
      response.status(500).json({
        message: t('User.DeactivatedFailed')
      })
    }
  }

  /**
   * 修改密码
   */
  @Post('/:id(\\d+)/change-password')
  async changePassword(request: Request, response: BaseResponse) {
    const { t, currentUser } = request
    const { oldPassword, newPassword, confirmPassword } = request.body as UserChangePasswordModel
    const id = parseInt(request.params.id, 10)

    if (!id) {
      response.status(400).json({
        message: t('User.ID.Require')
      })
      return
    }

    if (!oldPassword?.trim()) {
      response.status(400).json({
        message: t('OldPassword.Require')
      })
      return
    }

    if (!newPassword?.trim()) {
      response.status(400).json({
        message: t('NewPassword.Require')
      })
      return
    }

    if (!confirmPassword?.trim()) {
      response.status(400).json({
        message: t('ConfirmPassword.Require')
      })
      return
    }

    if (oldPassword.trim().length < 6) {
      response.status(400).json({
        message: t('OldPassword.MaxLength')
      })
      return
    }

    if (newPassword.trim().length < 6) {
      response.status(400).json({
        message: t('NewPassword.MaxLength')
      })
      return
    }

    if (oldPassword === newPassword) {
      response.status(400).json({
        message: t('NewPassword.Repeated')
      })
      return
    }

    // Check if username already exists
    const user = await UsersService.getUserById(id)
    if (!user) {
      response.status(404).json({
        message: t('User.NotExist')
      })
      return
    }

    if (!(await passwordEquals(oldPassword, user.password))) {
      response.status(400).json({
        message: t('OldPassword.Incorrect')
      })
      return
    }

    if (confirmPassword !== newPassword) {
      response.status(400).json({
        message: t('ConfirmPassword.NotMatch')
      })
      return
    }

    try {
      await UsersService.updateUser(
        id,
        {
          password: await passwordHash(newPassword)
        },
        { currentUser }
      )
      response.status(200).json({
        message: t('User.ChangedPassword')
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          response.status(404).json({
            message: t('User.NotExist')
          })
        }
        return
      }
      console.log(error)
      response.status(500).json({
        message: t('User.ChangedPasswordFailed')
      })
    }
  }

  /**
   * 重置密码
   */
  @Post('/:id(\\d+)/reset-password')
  async resetPassword(request: Request, response: BaseResponse) {
    const { t, currentUser } = request
    const { password } = request.body as UserResetPasswordModel
    const id = parseInt(request.params.id, 10)

    if (!id) {
      response.status(400).json({
        message: t('User.ID.Require')
      })
      return
    }

    if (!password?.trim()) {
      response.status(400).json({
        message: t('Password.Require')
      })
    }

    // Check if username already exists
    const user = await UsersService.getUserById(id)
    if (!user) {
      response.status(404).json({
        message: t('User.NotExist')
      })
      return
    }

    try {
      await UsersService.updateUser(
        id,
        {
          password: await passwordHash(password)
        },
        { currentUser }
      )
      response.status(200).json({
        message: t('User.ResetPassword')
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          response.status(404).json({
            message: t('User.NotExist')
          })
        }
        return
      }
      console.log(error)
      response.status(500).json({
        message: t('User.ResetPasswordFailed')
      })
    }
  }
}

export default new UsersController()
