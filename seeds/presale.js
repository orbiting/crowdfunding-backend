exports.default = {
  crowdfundings: [
    {
      name: 'PRESALE',
      beginDate: new Date('2017-07-24T06:00:00.000Z'),
      endDate: new Date('2018-01-31T00:00:00.000Z'),
      goals: [
        {
          name: 'SUSTAINABLE',
          people: 21000 - 14000,
          money: 700000000 - 340000000
        }
      ],
      packages: [
        {
          name: 'ABO',
          options: [
            {
              rewardName: 'ABO',
              rewardType: 'MembershipType',
              minAmount: 1,
              maxAmount: 1,
              defaultAmount: 1,
              price: 24000,
              userPrice: true
            }
          ]
        },
        {
          name: 'ABO_GIVE',
          options: [
            {
              rewardName: 'ABO',
              rewardType: 'MembershipType',
              minAmount: 1,
              maxAmount: 100,
              defaultAmount: 1,
              price: 24000,
              userPrice: false
            }
          ]
        },
        {
          name: 'BENEFACTOR',
          options: [
            {
              rewardName: 'BENEFACTOR_ABO',
              rewardType: 'MembershipType',
              minAmount: 1,
              maxAmount: 1,
              defaultAmount: 1,
              price: 100000,
              userPrice: false
            }
          ]
        },
        {
          name: 'DONATE',
          options: [
            {
              rewardName: null,
              rewardType: null,
              minAmount: 1,
              maxAmount: 1,
              defaultAmount: 1,
              price: 0,
              userPrice: true
            }
          ]
        }
      ]
    }
  ]
}
