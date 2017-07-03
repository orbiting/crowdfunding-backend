exports.default = {
  rewards: {
    "Goodie": [
      {
        name: 'NOTEBOOK'
      }
    ],
    "MembershipType": [
      {
        name: 'ABO',
        duration: 538, // 365 + 364 / 2,
        price: 24000
      },
      {
        name: 'BENEFACTOR_ABO',
        duration: 538, // 365 + 364 / 2,
        price: 24000
      }
    ]
  },
  crowdfundings: [
    {
      name: 'REPUBLIK',
      beginDate: new Date('2017-04-26T06:00:00.000Z'),
      endDate: new Date('2017-05-31T23:59:59.999Z'),
      goals: [
        {
          name: 'ONLY_THE_BEGINNING',
          people: 3000,
          money: 75000000
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
            },
            {
              rewardName: 'NOTEBOOK',
              rewardType: 'Goodie',
              minAmount: 0,
              maxAmount: 100,
              defaultAmount: 0,
              price: 2000,
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
